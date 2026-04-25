const API_PATH_BASE = "ha_context_explorer_probe";
const APP_VERSION = "0.3.3";
const PANEL_ELEMENT = "ha-context-explorer-probe-panel";
const STATIC_BASE = "/local/ha_context_explorer_probe";
const SCOPES = ["overview", "entities", "devices", "areas", "integrations", "relationships", "logic"];
const RELATIONSHIP_SETS = [
  {
    key: "entity_to_device",
    label: "Entity to device",
    nodes: [
      ["Entity", "entity_label", "entity_id"],
      ["Device", "device_label", "device_id"],
    ],
  },
  {
    key: "entity_to_area",
    label: "Entity to area",
    nodes: [
      ["Entity", "entity_label", "entity_id"],
      ["Area", "area_label", "area_id"],
    ],
    meta: ["source"],
  },
  {
    key: "entity_to_integration",
    label: "Entity to integration",
    nodes: [
      ["Entity", "entity_label", "entity_id"],
      ["Integration", "integration_label", "domain"],
    ],
  },
  {
    key: "device_to_area",
    label: "Device to area",
    nodes: [
      ["Device", "device_label", "device_id"],
      ["Area", "area_label", "area_id"],
    ],
  },
  {
    key: "device_to_integration",
    label: "Device to integration",
    nodes: [
      ["Device", "device_label", "device_id"],
      ["Integration", "integration_label", "domain"],
    ],
  },
];

const appState = {
  host: null,
  root: null,
  hass: null,
  panel: null,
  route: null,
  narrow: false,
  initialized: false,
  activeScope: "overview",
  data: {},
  loading: {},
  authBlocked: null,
  entitySearch: "",
  entityDomain: "",
  showRawIds: false,
  lifecycle: {
    hooksBound: false,
    recoveryScheduled: false,
    lastReason: "",
    lastRecovery: "",
    lastFailure: "",
    wrapperRecoveryScheduled: false,
    wrapperObserver: null,
  },
};

const SOURCE_STATUS_LABELS = {
  parsed_available: "Parsed and available",
  missing: "Missing",
  unsupported_starter_slice: "Unsupported in starter",
  parse_failed: "Parse failed",
  partially_parsed: "Partially parsed",
};

class HAContextExplorerProbePanel extends HTMLElement {
  set hass(hass) {
    appState.hass = hass;

    if (!recoverPanelShell(this, "hass update")) {
      return;
    }

    resumePanel("hass update");
  }

  set narrow(value) {
    appState.narrow = Boolean(value);
    this.toggleAttribute("narrow", appState.narrow);
  }

  set panel(value) {
    appState.panel = value;
    this._panel = value;
  }

  set route(value) {
    appState.route = value;
    this._route = value;
  }

  connectedCallback() {
    try {
      bindLifecycleHooks();
      recoverPanelShell(this, "connected");
      resumePanel("connected");
    } catch (error) {
      renderLifecycleFailure(this, error, "connected");
    }
  }

  disconnectedCallback() {
    if (appState.host === this) {
      appState.host = null;
      appState.root = null;
      appState.initialized = false;
    }
  }
}

if (!customElements.get(PANEL_ELEMENT)) {
  customElements.define(PANEL_ELEMENT, HAContextExplorerProbePanel);
}

bindLifecycleHooks();
scheduleWrapperRecovery("module loaded");

function isShellReady(root) {
  return Boolean(
    root &&
      root.__haContextExplorerProbeVersion === APP_VERSION &&
      root.host === appState.host &&
      root.getElementById("probe-shell") &&
      root.getElementById("view-overview") &&
      root.getElementById("raw-id-toggle")
  );
}

function bindLifecycleHooks() {
  if (appState.lifecycle.hooksBound) {
    return;
  }

  appState.lifecycle.hooksBound = true;
  window.addEventListener("pageshow", () => scheduleRecoveryChecks("page restored"));
  window.addEventListener("focus", () => scheduleRecoveryChecks("window focus"));
  window.addEventListener("popstate", () => scheduleRecoveryChecks("history navigation"));
  window.addEventListener("hashchange", () => scheduleRecoveryChecks("hash navigation"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      scheduleRecoveryChecks("visibility return");
    }
  });

  bindWrapperObserver();
}

function scheduleRecoveryChecks(reason) {
  scheduleWrapperRecovery(reason);
  scheduleLifecycleRecovery(reason);
}

function bindWrapperObserver() {
  if (appState.lifecycle.wrapperObserver || typeof MutationObserver !== "function") {
    return;
  }

  const attachObserver = () => {
    if (!document.body || appState.lifecycle.wrapperObserver) {
      return;
    }

    appState.lifecycle.wrapperObserver = new MutationObserver(() => {
      if (isProbablyProbeRoute()) {
        scheduleWrapperRecovery("panel wrapper mutation");
      }
    });
    appState.lifecycle.wrapperObserver.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) {
    attachObserver();
  } else {
    window.addEventListener("DOMContentLoaded", attachObserver, { once: true });
  }
}

function scheduleWrapperRecovery(reason) {
  if (appState.lifecycle.wrapperRecoveryScheduled) {
    return;
  }

  appState.lifecycle.wrapperRecoveryScheduled = true;
  window.setTimeout(() => {
    appState.lifecycle.wrapperRecoveryScheduled = false;
    try {
      ensureProbePanelMounted(reason);
    } catch (error) {
      renderWrapperRecoveryFailure(reason, error);
    }
  }, 0);
}

function ensureProbePanelMounted(reason) {
  const wrapper = findProbePanelCustom();
  if (!wrapper || !isProbePanelWrapper(wrapper)) {
    return false;
  }

  const existing = wrapper.querySelector(PANEL_ELEMENT);
  if (existing) {
    syncProbeElementContext(existing, wrapper);
    return false;
  }

  if (!isPanelWrapperEmpty(wrapper) || !customElements.get(PANEL_ELEMENT)) {
    return false;
  }

  const element = document.createElement(PANEL_ELEMENT);
  wrapper.append(element);
  syncProbeElementContext(element, wrapper);
  noteWrapperRecovery(reason, "Home Assistant panel wrapper was empty; remounted the probe panel element.");
  return true;
}

function findProbePanelCustom() {
  const direct = Array.from(document.querySelectorAll("ha-panel-custom")).find(isProbePanelWrapper);
  if (direct) {
    return direct;
  }
  return findElementDeep(document, "ha-panel-custom", isProbePanelWrapper);
}

function findElementDeep(root, localName, predicate) {
  const queue = [root];
  let visited = 0;

  while (queue.length && visited < 2500) {
    const current = queue.shift();
    visited += 1;

    if (current?.nodeType === Node.ELEMENT_NODE) {
      if (current.localName === localName && predicate(current)) {
        return current;
      }
      if (current.shadowRoot) {
        queue.push(current.shadowRoot);
      }
    }

    const children = current?.children ? Array.from(current.children) : [];
    children.forEach((child) => queue.push(child));
  }

  return null;
}

function isProbePanelWrapper(wrapper) {
  const hass = wrapper?.hass || appState.hass;
  const registeredPanel = hass?.panels?.[API_PATH_BASE];
  const wrapperPanel = wrapper?.panel || appState.panel;
  const hasProbeRegistration = Boolean(registeredPanel || panelValueLooksProbe(wrapperPanel));
  const registeredLooksProbe = Boolean(registeredPanel) || panelValueLooksProbe(wrapperPanel);
  const wrapperPanelMatches = wrapperPanel
    ? panelValueLooksProbe(wrapperPanel) || wrapperPanel === registeredPanel
    : Boolean(registeredPanel);

  return Boolean(
    hasProbeRegistration &&
      registeredLooksProbe &&
      wrapperPanelMatches &&
      customElements.get(PANEL_ELEMENT) &&
      isProbablyProbeRoute(wrapper)
  );
}

function panelValueLooksProbe(panel) {
  if (!panel) {
    return false;
  }

  return [
    panel.url_path,
    panel.urlPath,
    panel.frontend_url_path,
    panel.frontendUrlPath,
    panel.component_name,
    panel.componentName,
    panel.webcomponent_name,
    panel.webcomponentName,
  ]
    .filter(Boolean)
    .some((value) => String(value).includes(API_PATH_BASE) || String(value) === PANEL_ELEMENT);
}

function isProbablyProbeRoute(wrapper) {
  const route = wrapper?.route || appState.route || {};
  return [
    window.location.pathname,
    window.location.hash,
    route.path,
    route.prefix,
    route.tail,
  ]
    .filter(Boolean)
    .some((value) => String(value).includes(API_PATH_BASE));
}

function isPanelWrapperEmpty(wrapper) {
  return !wrapper.querySelector(PANEL_ELEMENT) && wrapper.children.length === 0 && !String(wrapper.innerHTML || "").trim();
}

function syncProbeElementContext(element, wrapper) {
  const hass = wrapper?.hass || appState.hass;
  const panel = wrapper?.panel || appState.panel || hass?.panels?.[API_PATH_BASE];
  const route = wrapper?.route || appState.route;

  if (panel) {
    element.panel = panel;
  }
  if (route) {
    element.route = route;
  }
  if (wrapper && "narrow" in wrapper) {
    element.narrow = Boolean(wrapper.narrow);
  } else {
    element.narrow = appState.narrow;
  }
  if (hass) {
    element.hass = hass;
  }
}

function noteWrapperRecovery(reason, detail) {
  appState.lifecycle.lastRecovery = `${reason}: ${detail}`;
  if (appState.host && appState.host.isConnected) {
    renderLifecycleNotice("Panel wrapper restored", detail);
  }
}

function renderWrapperRecoveryFailure(reason, error) {
  const wrapper = findProbePanelCustom();
  if (!wrapper || !isPanelWrapperEmpty(wrapper)) {
    return;
  }

  wrapper.innerHTML = `
    <link rel="stylesheet" href="${STATIC_BASE}/styles.css?v=${APP_VERSION}" />
    <div class="app-shell lifecycle-fallback">
      <section class="empty-state">
        <strong>Panel wrapper could not be restored</strong>
        <p>Home Assistant left the custom panel wrapper mounted, but the probe panel element could not be reattached.</p>
        <p>Lifecycle context: ${escapeText(reason)}.</p>
        <p id="wrapper-recovery-error"></p>
      </section>
    </div>
  `;

  const detail = wrapper.querySelector("#wrapper-recovery-error");
  if (detail) {
    detail.textContent = error instanceof Error ? error.message : String(error || "Unknown wrapper recovery error");
  }
}

function scheduleLifecycleRecovery(reason) {
  if (appState.lifecycle.recoveryScheduled) {
    return;
  }

  appState.lifecycle.recoveryScheduled = true;
  window.setTimeout(() => {
    appState.lifecycle.recoveryScheduled = false;
    const host = appState.host;
    if (!host || !host.isConnected) {
      return;
    }

    try {
      if (recoverPanelShell(host, reason)) {
        resumePanel(reason);
      }
    } catch (error) {
      renderLifecycleFailure(host, error, reason);
    }
  }, 0);
}

function recoverPanelShell(host, reason) {
  if (!host) {
    return false;
  }

  const previousHost = appState.host;
  const previousRoot = appState.root;
  const wasInitialized = appState.initialized;
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  const hostChanged = previousHost && previousHost !== host;
  const rootChanged = previousRoot && previousRoot !== root;

  appState.host = host;
  appState.root = root;

  const shellReady = isShellReady(root);
  if (!shellReady) {
    initializeShell(root);
    const hadPreviousShell = Boolean(wasInitialized || previousHost || previousRoot || rootChanged || hostChanged);
    if (hadPreviousShell) {
      noteLifecycleRecovery(reason, shellRecoveryDetail(true, hostChanged, rootChanged));
    }
    return true;
  }

  appState.initialized = true;
  syncShellState();
  if (hostChanged || rootChanged) {
    noteLifecycleRecovery(reason, shellRecoveryDetail(false, hostChanged, rootChanged));
  }
  return true;
}

function shellRecoveryDetail(shellWasMissing, hostChanged, rootChanged) {
  if (shellWasMissing) {
    return "Shell missing or incomplete; rebuilt active panel shell.";
  }
  if (hostChanged) {
    return "Host mismatch detected; rebound the active panel instance.";
  }
  if (rootChanged) {
    return "Shadow root mismatch detected; rebound the active panel root.";
  }
  return "Shell integrity check passed after lifecycle recovery.";
}

function resumePanel(reason) {
  if (!appState.root || !isShellReady(appState.root)) {
    return;
  }

  appState.lifecycle.lastReason = reason;
  if (!appState.host?.isConnected) {
    setStatus("Waiting", "Panel is detached; waiting for Home Assistant to remount it");
    return;
  }

  const scope = appState.activeScope || "overview";
  if (!appState.hass || typeof appState.hass.callApi !== "function") {
    setStatus("Waiting", "Waiting for Home Assistant panel context");
    return;
  }

  if (appState.loading[scope] || !appState.data[scope]) {
    loadScope(scope);
    return;
  }

  renderScope(scope);
}

function initializeShell(root) {
  appState.root = root;
  root.innerHTML = shellHtml();
  root.__haContextExplorerProbeVersion = APP_VERSION;
  bindTabs();
  bindEntityFilters();
  bindRawToggle();
  appState.initialized = true;
  syncShellState();
}

function syncShellState() {
  if (!appState.root) {
    return;
  }

  const scope = appState.activeScope || "overview";
  appState.root.querySelectorAll("[data-scope]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scope === scope);
  });
  appState.root.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${scope}`);
  });

  const search = byId("entities-search");
  if (search) {
    search.value = appState.entitySearch || "";
  }

  const rawToggle = byId("raw-id-toggle");
  if (rawToggle) {
    rawToggle.checked = appState.showRawIds;
  }
}

function noteLifecycleRecovery(reason, detail) {
  appState.lifecycle.lastRecovery = `${reason}: ${detail}`;
  renderLifecycleNotice("Panel shell restored", detail);
}

function renderLifecycleNotice(title, detail) {
  const notice = byId("lifecycle-notice");
  if (!notice) {
    return;
  }

  notice.hidden = false;
  notice.textContent = "";
  notice.append(el("strong", "", title));
  notice.append(el("p", "", detail));
}

function renderLifecycleFailure(host, error, reason = "lifecycle restore") {
  const root = host.shadowRoot || host.attachShadow({ mode: "open" });
  appState.host = host;
  appState.root = root;
  appState.initialized = false;
  appState.lifecycle.lastFailure = reason;
  root.innerHTML = `
    <link rel="stylesheet" href="${STATIC_BASE}/styles.css?v=${APP_VERSION}" />
    <div class="app-shell lifecycle-fallback">
      <section class="empty-state">
        <strong>Panel could not be restored</strong>
        <p>The Home Assistant panel shell loaded, but its frontend lifecycle failed before the explorer UI could be rebuilt.</p>
        <p>Lifecycle context: ${escapeText(reason)}.</p>
        <p>Navigate away and back to retry the panel mount; reload the browser page if this fallback remains.</p>
        <p id="lifecycle-error-detail"></p>
      </section>
    </div>
  `;

  const detail = root.getElementById("lifecycle-error-detail");
  if (detail) {
    detail.textContent = error instanceof Error ? error.message : String(error || "Unknown lifecycle error");
  }
}

function shellHtml() {
  return `
    <link rel="stylesheet" href="${STATIC_BASE}/styles.css?v=${APP_VERSION}" />
    <div class="app-shell" id="probe-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Context Explorer Probe</p>
          <h1>Home Assistant Context</h1>
        </div>
        <div class="status-chip" aria-live="polite">
          <span id="data-state-label">Loading</span>
          <small id="data-state-detail">Preparing data views</small>
        </div>
      </header>

      <nav class="tabbar" aria-label="Explorer views">
        <button class="tab-button active" type="button" data-scope="overview">Overview</button>
        <button class="tab-button" type="button" data-scope="entities">Entities</button>
        <button class="tab-button" type="button" data-scope="devices">Devices</button>
        <button class="tab-button" type="button" data-scope="areas">Areas</button>
        <button class="tab-button" type="button" data-scope="integrations">Integrations</button>
        <button class="tab-button" type="button" data-scope="relationships">Relationships</button>
        <button class="tab-button" type="button" data-scope="logic">Logic</button>
        <label class="raw-toggle">
          <input id="raw-id-toggle" type="checkbox" />
          <span>Show raw identifiers</span>
        </label>
      </nav>

      <section class="auth-notice" id="auth-notice" hidden aria-live="polite"></section>
      <section class="lifecycle-notice" id="lifecycle-notice" hidden aria-live="polite"></section>

      <main class="workspace">
        <section class="view active" id="view-overview">
          <div class="section-heading">
            <h2>Overview</h2>
            <span class="version">v${APP_VERSION}</span>
          </div>
          <div class="metric-grid" id="overview-counts" data-loading-target>Loading</div>
          <div class="two-column">
            <section>
              <h3>Warnings</h3>
              <div class="stack" id="overview-warnings">Loading</div>
            </section>
            <section>
              <h3>Future scopes</h3>
              <div class="stack" id="future-scopes">Loading</div>
            </section>
          </div>
        </section>

        <section class="view" id="view-entities">
          <div class="section-heading">
            <h2>Entities</h2>
            <span class="count-label" id="entities-count">0 items</span>
          </div>
          <div class="toolbar">
            <label>
              <span>Search</span>
              <input id="entities-search" type="search" autocomplete="off" />
            </label>
            <label>
              <span>Domain</span>
              <select id="entities-domain">
                <option value="">All domains</option>
              </select>
            </label>
          </div>
          <div class="list" id="entities-list" data-loading-target>Loading</div>
        </section>

        <section class="view" id="view-devices">
          <div class="section-heading">
            <h2>Devices</h2>
            <span class="count-label" id="devices-count">0 items</span>
          </div>
          <div class="list" id="devices-list" data-loading-target>Loading</div>
        </section>

        <section class="view" id="view-areas">
          <div class="section-heading">
            <h2>Areas</h2>
            <span class="count-label" id="areas-count">0 items</span>
          </div>
          <div class="list" id="areas-list" data-loading-target>Loading</div>
        </section>

        <section class="view" id="view-integrations">
          <div class="section-heading">
            <h2>Integrations</h2>
            <span class="count-label" id="integrations-count">0 items</span>
          </div>
          <div class="list" id="integrations-list" data-loading-target>Loading</div>
        </section>

        <section class="view" id="view-relationships">
          <div class="section-heading">
            <h2>Relationships</h2>
          </div>
          <div class="metric-grid" id="relationships-summary" data-loading-target>Loading</div>
          <div class="relationship-lists" id="relationships-lists"></div>
        </section>

        <section class="view" id="view-logic">
          <div class="section-heading">
            <h2>Logic</h2>
            <span class="count-label" id="logic-count">0 references</span>
          </div>
          <div class="metric-grid" id="logic-summary" data-loading-target>Loading</div>
          <section class="logic-section">
            <div class="relationship-heading">
              <h3>Source Coverage</h3>
              <span class="badge muted">starter slice</span>
            </div>
            <div class="coverage-grid" id="logic-source-coverage">Loading</div>
          </section>
          <div class="logic-grid">
            <section class="logic-section">
              <h3>Automations</h3>
              <div class="list" id="logic-automations">Loading</div>
            </section>
            <section class="logic-section">
              <h3>Scripts</h3>
              <div class="list" id="logic-scripts">Loading</div>
            </section>
          </div>
          <section class="logic-section">
            <h3>Entity Usage</h3>
            <div class="list" id="logic-entity-references">Loading</div>
          </section>
          <section class="logic-section">
            <h3>Additional Caveats</h3>
            <div class="stack" id="logic-warnings">Loading</div>
          </section>
        </section>
      </main>
    </div>
  `;
}

function bindTabs() {
  if (!appState.root) {
    return;
  }

  appState.root.querySelectorAll("[data-scope]").forEach((button) => {
    button.addEventListener("click", () => activateScope(button.dataset.scope));
  });
}

function bindEntityFilters() {
  const search = byId("entities-search");
  const domain = byId("entities-domain");
  if (!search || !domain) {
    return;
  }

  search.addEventListener("input", () => {
    appState.entitySearch = search.value.trim().toLowerCase();
    renderEntities();
  });

  domain.addEventListener("change", () => {
    appState.entityDomain = domain.value;
    renderEntities();
  });
}

function bindRawToggle() {
  const toggle = byId("raw-id-toggle");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("change", (event) => {
    appState.showRawIds = event.target.checked;
    renderScope(appState.activeScope);
  });
}

function activateScope(scope) {
  if (!SCOPES.includes(scope)) {
    return;
  }
  if (!appState.root) {
    return;
  }

  appState.activeScope = scope;
  appState.root.querySelectorAll("[data-scope]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scope === scope);
  });
  appState.root.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${scope}`);
  });

  loadScope(scope);
}

async function loadScope(scope) {
  if (appState.authBlocked) {
    appState.data[scope] = authBlockedPayload(scope);
    if (appState.root) {
      renderScope(scope);
    }
    return;
  }

  if (appState.loading[scope]) {
    if (appState.root) {
      setStatus("Loading", "Reading Home Assistant data");
      setViewLoading(scope);
    }
    return;
  }

  if (appState.data[scope]) {
    if (appState.root) {
      renderScope(scope);
    }
    return;
  }

  if (!appState.hass || typeof appState.hass.callApi !== "function") {
    blockProtectedData("The Home Assistant panel context did not provide an authenticated API client.");
    if (appState.root) {
      renderScope(scope);
    }
    return;
  }

  appState.loading[scope] = true;
  setStatus("Loading", "Reading Home Assistant data");
  setViewLoading(scope);

  try {
    appState.data[scope] = await appState.hass.callApi("GET", `${API_PATH_BASE}/${scope}`);
    if (appState.root) {
      setStatus("Connected", "Admin data endpoint available");
      clearGlobalNotice();
    }
  } catch (error) {
    const message = errorMessage(error);
    if (isAuthError(error)) {
      blockProtectedData(message);
    } else {
      appState.data[scope] = { error: message, items: [], warnings: [] };
      if (appState.root) {
        setStatus("Unavailable", shortError(error));
      }
    }
  } finally {
    appState.loading[scope] = false;
    if (appState.root) {
      renderScope(scope);
    }
  }
}

function renderScope(scope) {
  try {
    if (!appState.host || !recoverPanelShell(appState.host, `render ${scope}`)) {
      return;
    }

    if (scope === "overview") {
      renderOverview();
    } else if (scope === "entities") {
      renderEntities();
    } else if (scope === "devices") {
      renderDevices();
    } else if (scope === "areas") {
      renderAreas();
    } else if (scope === "integrations") {
      renderIntegrations();
    } else if (scope === "relationships") {
      renderRelationships();
    } else if (scope === "logic") {
      renderLogic();
    }
  } catch (error) {
    renderLifecycleFailure(appState.host, error, `render ${scope}`);
  }
}

function renderOverview() {
  const data = appState.data.overview || {};
  if (data.error) {
    setEmpty("overview-counts", "Data unavailable", data.error);
    setEmpty("overview-warnings", "Auth required", "Real data endpoints require an authenticated admin session.");
    setEmpty("future-scopes", "Future scopes unavailable", "Capability data could not be loaded.");
    return;
  }

  const counts = data.counts || {};
  const relationshipTotal = Object.values(counts.relationships || {}).reduce((total, value) => total + Number(value || 0), 0);
  const metrics = [
    ["Entities", counts.entities],
    ["Devices", counts.devices],
    ["Areas", counts.areas],
    ["Integrations", counts.integrations],
    ["Relationships", relationshipTotal],
    ["Logic refs", counts.logic?.total_references],
  ];

  const countTarget = clearById("overview-counts");
  metrics.forEach(([label, value]) => {
    const card = el("article", "metric-card");
    card.append(el("span", "metric-label", label));
    card.append(el("strong", "metric-value", formatValue(value)));
    countTarget.append(card);
  });

  renderWarnings("overview-warnings", data.warnings || []);

  const futureTarget = clearById("future-scopes");
  (data.capabilities?.future || []).forEach((scope) => {
    const row = el("article", "list-row");
    row.append(el("div", "row-title", scope.scope));
    row.append(el("span", "badge muted", scope.status || "not_implemented"));
    futureTarget.append(row);
  });
}

function renderEntities() {
  const data = appState.data.entities || {};
  const target = clearById("entities-list");
  if (data.error) {
    setCountText("entities-count", 0);
    setEmpty("entities-list", "Entities unavailable", data.error);
    return;
  }

  const allItems = data.items || [];
  refreshDomainFilter(allItems);

  const filtered = allItems.filter((item) => {
    const domainMatch = !appState.entityDomain || item.domain === appState.entityDomain;
    const searchText = [
      item.display_name,
      item.entity_id,
      item.friendly_name,
      item.state,
      item.integration_label,
      item.integration,
      item.area_label,
      item.resolved_area_id,
      item.device_label,
    ].filter(Boolean).join(" ").toLowerCase();
    return domainMatch && (!appState.entitySearch || searchText.includes(appState.entitySearch));
  });

  setCountText("entities-count", filtered.length, allItems.length);

  if (!filtered.length) {
    setEmpty("entities-list", "No entities", "No entities match the current view.");
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((item) => {
    const row = el("article", "list-row entity-row");
    const main = el("div", "row-main");
    const title = item.display_name || entityFallback(item.entity_id);
    main.append(el("div", "row-title", title));
    main.append(el("div", "row-subtitle", entitySubtitle(item, title)));

    const details = el("div", "row-details");
    details.append(badge(item.domain));
    if (item.integration_label) details.append(badge(item.integration_label));
    if (item.area_label) details.append(badge(`Area: ${item.area_label}`));
    if (item.device_label) details.append(badge(`Device: ${item.device_label}`));
    if (appState.showRawIds) {
      details.append(badge(`ID: ${item.entity_id}`));
      if (item.device_id) details.append(badge(`Device ID: ${item.device_id}`));
      if (item.resolved_area_id) details.append(badge(`Area ID: ${item.resolved_area_id}`));
      if (item.integration) details.append(badge(`Domain: ${item.integration}`));
    }

    const state = el("div", "state-pill", item.state ?? "unknown");
    row.append(main, details, state);
    fragment.append(row);
  });

  target.append(fragment);
}

function renderDevices() {
  const data = appState.data.devices || {};
  renderList("devices-list", data, (item) => ({
    title: item.display_name || technicalFallback("Device", item.device_id),
    subtitle: appState.showRawIds ? item.device_id : [item.manufacturer, item.model].filter(Boolean).join(" "),
    badges: [
      `${formatValue(item.linked_entity_count)} entities`,
      item.area_label ? `Area: ${item.area_label}` : null,
      ...(item.integration_labels || []),
      ...(appState.showRawIds ? rawBadges([["Device ID", item.device_id], ["Area ID", item.area_id]]) : []),
      ...(appState.showRawIds ? (item.integrations || []).map((domain) => `Domain: ${domain}`) : []),
    ],
  }));
  setCountText("devices-count", (data.items || []).length);
}

function renderAreas() {
  const data = appState.data.areas || {};
  renderList("areas-list", data, (item) => ({
    title: item.display_name || technicalFallback("Area", item.area_id),
    subtitle: appState.showRawIds ? item.area_id : "",
    badges: [
      `${formatValue(item.device_count)} devices`,
      `${formatValue(item.entity_count)} entities`,
      ...(appState.showRawIds ? rawBadges([["Area ID", item.area_id]]) : []),
    ],
  }));
  setCountText("areas-count", (data.items || []).length);
}

function renderIntegrations() {
  const data = appState.data.integrations || {};
  renderList("integrations-list", data, (item) => ({
    title: item.display_name || humanizeIdentifier(item.domain),
    subtitle: appState.showRawIds ? item.domain : item.kind,
    badges: [
      appState.showRawIds ? item.kind : null,
      item.source,
      item.loaded_component ? "loaded" : null,
      `${formatValue(item.entry_count)} entries`,
      `${formatValue(item.entity_count)} entities`,
      `${formatValue(item.device_count)} devices`,
      ...(appState.showRawIds ? rawBadges([["Domain", item.domain]]) : []),
    ],
  }));
  setCountText("integrations-count", (data.items || []).length);
}

function renderRelationships() {
  const data = appState.data.relationships || {};
  const summaryTarget = clearById("relationships-summary");
  const listTarget = clearById("relationships-lists");

  if (data.error) {
    setEmpty("relationships-summary", "Relationships unavailable", data.error);
    return;
  }

  RELATIONSHIP_SETS.forEach((set) => {
    const count = data.counts?.[set.key] || 0;
    const card = el("article", "metric-card compact");
    card.append(el("span", "metric-label", set.label));
    card.append(el("strong", "metric-value", formatValue(count)));
    summaryTarget.append(card);
  });

  RELATIONSHIP_SETS.forEach((set) => {
    const rows = data[set.key] || [];
    const section = el("section", "relationship-set");
    const heading = el("div", "relationship-heading");
    heading.append(el("h3", "", set.label));
    heading.append(el("span", "badge muted", `${Math.min(rows.length, 80)} of ${rows.length}`));
    section.append(heading);

    const table = el("div", "relationship-table");
    rows.slice(0, 80).forEach((row) => {
      const line = relationshipRow(row, set);
      table.append(line);
    });
    section.append(table);
    listTarget.append(section);
  });
}

function renderLogic() {
  const data = appState.data.logic || {};
  if (data.error) {
    setCountText("logic-count", 0);
    setEmpty("logic-summary", "Logic unavailable", data.error);
    setEmpty("logic-source-coverage", "Source coverage unavailable", data.error);
    setEmpty("logic-automations", "Automations unavailable", data.error);
    setEmpty("logic-scripts", "Scripts unavailable", data.error);
    setEmpty("logic-entity-references", "Entity usage unavailable", data.error);
    setEmpty("logic-warnings", "Caveats unavailable", data.error);
    return;
  }

  const counts = data.counts || {};
  const logicCount = byId("logic-count");
  if (logicCount) {
    logicCount.textContent = `${formatValue(counts.total_references)} refs across ${formatValue(counts.referenced_entities)} entities`;
  }

  const summaryTarget = clearById("logic-summary");
  [
    ["Automations", counts.automations],
    ["Scripts", counts.scripts],
    ["Referenced entities", counts.referenced_entities],
    ["Total refs", counts.total_references],
  ].forEach(([label, value]) => {
    const card = el("article", "metric-card compact");
    card.append(el("span", "metric-label", label));
    card.append(el("strong", "metric-value", formatValue(value)));
    summaryTarget.append(card);
  });

  const referencesById = Object.fromEntries((data.entity_references || []).map((item) => [item.entity_id, item]));
  const scriptLabels = Object.fromEntries((data.scripts || []).map((item) => [item.id, item.display_name || item.entity_id || item.id]));

  renderSourceCoverage(data.source_coverage || []);
  renderLogicConfigList("logic-automations", data.automations || [], referencesById, scriptLabels, "automation");
  renderLogicConfigList("logic-scripts", data.scripts || [], referencesById, scriptLabels, "script");
  renderEntityReferences(data.entity_references || []);
  renderWarnings("logic-warnings", data.warnings || []);
}

function renderSourceCoverage(items) {
  const target = clearById("logic-source-coverage");
  if (!items.length) {
    setEmpty("logic-source-coverage", "No source coverage", "The logic endpoint did not report source coverage.");
    return;
  }

  items.forEach((item) => {
    const card = el("article", `coverage-card status-${item.status || "unknown"}`);
    const header = el("div", "coverage-header");
    header.append(el("strong", "", item.label || item.source || "Source"));
    header.append(el("span", "badge muted", SOURCE_STATUS_LABELS[item.status] || item.status || "unknown"));
    card.append(header);
    card.append(el("div", "row-subtitle", item.source_file || item.source || "generic source"));
    card.append(el("div", "coverage-count", `${formatValue(item.parsed_item_count)} parsed item(s)`));
    if (item.detail) {
      card.append(el("p", "coverage-detail", item.detail));
    }
    target.append(card);
  });
}

function renderLogicConfigList(targetId, items, referencesById, scriptLabels, kind) {
  const target = clearById(targetId);
  if (!items.length) {
    setEmpty(targetId, kind === "automation" ? "No automations" : "No scripts", "No parsed items were returned for this source.");
    return;
  }

  items.forEach((item) => {
    const row = el("article", "list-row logic-row");
    const main = el("div", "row-main");
    main.append(el("div", "row-title", item.display_name || item.alias || item.entity_id || item.id || "Unnamed"));
    main.append(el("div", "row-subtitle", item.source_file || ""));

    const details = el("div", "row-details");
    if (item.source_file) details.append(badge(item.source_file));
    if (item.mode) details.append(badge(`Mode: ${item.mode}`));
    if (kind === "automation" && item.enabled !== null && item.enabled !== undefined) {
      details.append(badge(item.enabled ? "Enabled" : "Disabled"));
    }
    const summary = item.summary || {};
    Object.entries(summary).forEach(([label, value]) => details.append(badge(`${humanizeIdentifier(label)}: ${formatValue(value)}`)));

    row.append(main, details);
    if (appState.showRawIds) {
      row.append(rawIdentifierBlock(rawBadges([["ID", item.id], ["Entity", item.entity_id], ["Source", item.source_kind]])));
    }
    row.append(
      logicReferenceChips(
        "Entities",
        item.referenced_entities || [],
        (entityId) => referenceLabel(entityId, referencesById),
        "No entity references",
        (entityId) => entityId
      )
    );
    row.append(
      logicReferenceChips(
        "Scripts",
        item.referenced_script_ids || [],
        (scriptId) => scriptLabel(scriptId, scriptLabels),
        "No script references",
        (scriptId) => `script.${scriptId}`
      )
    );
    target.append(row);
  });
}

function renderEntityReferences(items) {
  const target = clearById("logic-entity-references");
  if (!items.length) {
    setEmpty("logic-entity-references", "No entity references", "No entity references were extracted from the parsed starter sources.");
    return;
  }

  items.slice(0, 120).forEach((item) => {
    const row = el("article", "list-row");
    const main = el("div", "row-main");
    main.append(el("div", "row-title", item.display_name || entityFallback(item.entity_id)));
    main.append(el("div", "row-subtitle", `${formatValue(item.reference_count)} total reference(s)`));
    const details = el("div", "row-details");
    details.append(badge(`${formatValue(item.reference_count)} refs`));
    details.append(badge(`${formatValue((item.referenced_by_automations || []).length)} automations`));
    details.append(badge(`${formatValue((item.referenced_by_scripts || []).length)} scripts`));
    row.append(main, details);
    if (appState.showRawIds) {
      row.append(rawIdentifierBlock(rawBadges([["Entity", item.entity_id]])));
    }
    target.append(row);
  });
}

function logicReferenceChips(label, values, formatter, emptyText, rawFormatter) {
  const block = el("div", "logic-reference-block");
  block.append(el("span", "logic-reference-label", label));
  const details = el("div", "row-details");
  if (!values.length) {
    details.append(el("span", "muted-text", emptyText));
  } else {
    values.slice(0, 12).forEach((value) => details.append(badge(formatter(value))));
    if (values.length > 12) {
      details.append(badge(`+${values.length - 12} more`));
    }
  }
  block.append(details);
  if (appState.showRawIds && values.length && rawFormatter) {
    block.append(rawIdentifierBlock(values.slice(0, 12).map((value) => rawFormatter(value))));
  }
  return block;
}

function referenceLabel(entityId, referencesById) {
  return referencesById[entityId]?.display_name || entityFallback(entityId);
}

function scriptLabel(scriptId, scriptLabels) {
  return scriptLabels[scriptId] || humanizeIdentifier(scriptId);
}

function rawIdentifierBlock(values) {
  const raw = el("div", "raw-identifiers");
  values.filter(Boolean).forEach((value) => raw.append(el("span", "", value)));
  if (!raw.childNodes.length) {
    raw.append(el("span", "", "No raw identifiers"));
  }
  return raw;
}

function relationshipRow(row, set) {
  const line = el("div", "relationship-row");
  const summary = el("div", "relationship-summary-line");

  set.nodes.forEach(([kind, labelField, rawField], index) => {
    if (index > 0) {
      summary.append(el("span", "relationship-arrow", "->"));
    }
    const node = el("span", "relationship-node", displayNode(row, kind, labelField, rawField));
    summary.append(node);
  });

  line.append(summary);

  const meta = el("div", "row-details");
  (set.meta || []).forEach((field) => {
    if (row[field]) meta.append(badge(`${field}: ${row[field]}`));
  });
  if (meta.childNodes.length) {
    line.append(meta);
  }

  if (appState.showRawIds) {
    const raw = el("div", "raw-identifiers");
    set.nodes.forEach(([kind, , rawField]) => {
      if (row[rawField]) {
        raw.append(el("span", "", `${kind} ${rawField}: ${row[rawField]}`));
      }
    });
    if (raw.childNodes.length) {
      line.append(raw);
    }
  }

  return line;
}

function displayNode(row, kind, labelField, rawField) {
  return row[labelField] || technicalFallback(kind, row[rawField]);
}

function renderList(targetId, data, mapper) {
  const target = clearById(targetId);
  if (data.error) {
    setEmpty(targetId, "Data unavailable", data.error);
    return;
  }

  const items = data.items || [];
  if (!items.length) {
    setEmpty(targetId, "No items", "This scope returned no items.");
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const mapped = mapper(item);
    const row = el("article", "list-row");
    const main = el("div", "row-main");
    main.append(el("div", "row-title", mapped.title || "Unnamed"));
    main.append(el("div", "row-subtitle", mapped.subtitle || ""));
    const details = el("div", "row-details");
    mapped.badges.filter(Boolean).forEach((text) => details.append(badge(text)));
    row.append(main, details);
    fragment.append(row);
  });
  target.append(fragment);
}

function refreshDomainFilter(items) {
  const select = byId("entities-domain");
  if (!select) {
    return;
  }

  const current = select.value;
  const domains = [...new Set(items.map((item) => item.domain).filter(Boolean))].sort();

  select.textContent = "";
  select.append(new Option("All domains", ""));
  domains.forEach((domain) => select.append(new Option(domain, domain)));
  select.value = domains.includes(current) ? current : "";
  appState.entityDomain = select.value;
}

function renderWarnings(targetId, warnings) {
  const target = clearById(targetId);
  if (!warnings.length) {
    target.append(el("p", "muted-text", "No warnings reported."));
    return;
  }

  warnings.forEach((warning) => {
    const row = el("article", "warning-row", warning);
    target.append(row);
  });
}

function setViewLoading(scope) {
  const view = byId(`view-${scope}`);
  if (!view) {
    return;
  }

  const list = view.querySelector("[data-loading-target]");
  if (list) {
    list.textContent = "Loading";
  }
}

function setStatus(label, detail) {
  const labelTarget = byId("data-state-label");
  const detailTarget = byId("data-state-detail");
  if (!labelTarget || !detailTarget) {
    return;
  }

  labelTarget.textContent = label;
  detailTarget.textContent = detail;
}

function blockProtectedData(message) {
  appState.authBlocked = message;
  SCOPES.forEach((scope) => {
    appState.data[scope] = authBlockedPayload(scope);
  });
  if (appState.root) {
    setStatus("Auth required", "Protected data did not load");
    renderGlobalAuthFailure(message);
  }
}

function authBlockedPayload(scope) {
  return {
    scope,
    error: `The native panel loaded, but protected Home Assistant data could not be accessed. ${appState.authBlocked || ""}`.trim(),
    items: [],
    warnings: [],
  };
}

function renderGlobalAuthFailure(message) {
  const notice = byId("auth-notice");
  if (!notice) {
    return;
  }

  notice.hidden = false;
  notice.textContent = "";
  notice.append(el("strong", "", "Protected data unavailable"));
  notice.append(
    el(
      "p",
      "",
      `The native Home Assistant panel loaded, but the current frontend auth context was not accepted by the admin-only JSON endpoints. ${message}`
    )
  );
}

function clearGlobalNotice() {
  const notice = byId("auth-notice");
  if (!notice) {
    return;
  }

  notice.hidden = true;
  notice.textContent = "";
}

function setCountText(id, count, total) {
  const target = byId(id);
  if (!target) return;
  target.textContent = total === undefined ? `${formatValue(count)} items` : `${formatValue(count)} of ${formatValue(total)} items`;
}

function setEmpty(targetId, title, body) {
  const target = clearById(targetId);
  const empty = el("div", "empty-state");
  empty.append(el("strong", "", title));
  empty.append(el("p", "", body));
  target.append(empty);
}

function clearById(id) {
  const target = byId(id);
  if (!target) {
    if (appState.host && recoverPanelShell(appState.host, `missing target ${id}`)) {
      const recoveredTarget = byId(id);
      if (recoveredTarget) {
        recoveredTarget.textContent = "";
        return recoveredTarget;
      }
    }
    throw new Error(`Panel target missing: ${id}`);
  }

  target.textContent = "";
  return target;
}

function byId(id) {
  return appState.root ? appState.root.getElementById(id) : null;
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function escapeText(value) {
  const span = document.createElement("span");
  span.textContent = String(value || "");
  return span.innerHTML;
}

function badge(text) {
  return el("span", "badge", text);
}

function rawBadges(pairs) {
  return pairs.filter(([, value]) => Boolean(value)).map(([label, value]) => `${label}: ${value}`);
}

function entitySubtitle(item, title) {
  if (appState.showRawIds) {
    return item.entity_id;
  }
  if (title === entityFallback(item.entity_id)) {
    return "No friendly label available";
  }
  return [item.domain, item.integration_label, item.area_label].filter(Boolean).join(" / ");
}

function entityFallback(entityId) {
  if (!entityId) {
    return "Unnamed entity";
  }
  return `Entity: ${compactIdentifier(entityId)}`;
}

function technicalFallback(kind, identifier) {
  if (!identifier) {
    return `Unnamed ${kind.toLowerCase()}`;
  }
  return `${kind} (${identifierSuffix(identifier)})`;
}

function identifierSuffix(identifier) {
  const text = String(identifier);
  return text.length <= 8 ? text : `...${text.slice(-8)}`;
}

function compactIdentifier(identifier, maxLength = 48) {
  const text = String(identifier || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, 24)}...${text.slice(-16)}`;
}

function humanizeIdentifier(identifier) {
  const text = String(identifier || "").replace(/[_\-.]/g, " ").trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Integration";
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function errorMessage(error) {
  if (isAuthError(error)) {
    const status = error.status || error.statusCode || "auth";
    return `${status} unauthorized or forbidden. The Home Assistant frontend auth context did not reach this endpoint as an admin request.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function shortError(error) {
  if (isAuthError(error)) {
    return "Protected request failed";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Request failed";
}

function isAuthError(error) {
  const status = error?.status || error?.statusCode;
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || error || "").toLowerCase();
  return status === 401 || status === 403 || code.includes("unauthorized") || message.includes("unauthorized");
}
