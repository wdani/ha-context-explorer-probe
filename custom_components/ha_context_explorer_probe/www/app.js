const API_PATH_BASE = "ha_context_explorer_probe";
const APP_VERSION = "0.2.2";
const STATIC_BASE = "/local/ha_context_explorer_probe";
const SCOPES = ["overview", "entities", "devices", "areas", "integrations", "relationships"];
const RELATIONSHIP_SETS = [
  ["entity_to_device", "Entity to device", ["entity_id", "device_id"]],
  ["entity_to_area", "Entity to area", ["entity_id", "area_id", "source"]],
  ["entity_to_integration", "Entity to integration", ["entity_id", "domain"]],
  ["device_to_area", "Device to area", ["device_id", "area_id"]],
  ["device_to_integration", "Device to integration", ["device_id", "domain"]],
];

const appState = {
  host: null,
  root: null,
  hass: null,
  initialized: false,
  activeScope: "overview",
  data: {},
  loading: {},
  authBlocked: null,
  entitySearch: "",
  entityDomain: "",
};

class HAContextExplorerProbePanel extends HTMLElement {
  set hass(hass) {
    appState.hass = hass;
    if (appState.initialized && !appState.data.overview && !appState.loading.overview) {
      loadScope("overview");
    }
  }

  set narrow(value) {
    this.toggleAttribute("narrow", Boolean(value));
  }

  set panel(value) {
    this._panel = value;
  }

  set route(value) {
    this._route = value;
  }

  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    if (appState.host !== this) {
      appState.host = this;
      appState.root = this.shadowRoot;
      appState.root.innerHTML = shellHtml();
      bindTabs();
      bindEntityFilters();
      appState.initialized = true;
    }

    if (appState.hass) {
      loadScope("overview");
    } else {
      setStatus("Waiting", "Waiting for Home Assistant panel context");
    }
  }
}

customElements.define("ha-context-explorer-probe-panel", HAContextExplorerProbePanel);

function shellHtml() {
  return `
    <link rel="stylesheet" href="${STATIC_BASE}/styles.css?v=${APP_VERSION}" />
    <div class="app-shell">
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
      </nav>

      <section class="auth-notice" id="auth-notice" hidden aria-live="polite"></section>

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
      </main>
    </div>
  `;
}

function bindTabs() {
  appState.root.querySelectorAll("[data-scope]").forEach((button) => {
    button.addEventListener("click", () => activateScope(button.dataset.scope));
  });
}

function bindEntityFilters() {
  const search = byId("entities-search");
  const domain = byId("entities-domain");

  search.addEventListener("input", () => {
    appState.entitySearch = search.value.trim().toLowerCase();
    renderEntities();
  });

  domain.addEventListener("change", () => {
    appState.entityDomain = domain.value;
    renderEntities();
  });
}

function activateScope(scope) {
  if (!SCOPES.includes(scope)) {
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
    renderScope(scope);
    return;
  }

  if (appState.data[scope] || appState.loading[scope]) {
    renderScope(scope);
    return;
  }

  if (!appState.hass || typeof appState.hass.callApi !== "function") {
    blockProtectedData("The Home Assistant panel context did not provide an authenticated API client.");
    renderScope(scope);
    return;
  }

  appState.loading[scope] = true;
  setStatus("Loading", "Reading Home Assistant data");
  setViewLoading(scope);

  try {
    appState.data[scope] = await appState.hass.callApi("GET", `${API_PATH_BASE}/${scope}`);
    setStatus("Connected", "Admin data endpoint available");
    clearGlobalNotice();
  } catch (error) {
    const message = errorMessage(error);
    if (isAuthError(error)) {
      blockProtectedData(message);
    } else {
      appState.data[scope] = { error: message, items: [], warnings: [] };
      setStatus("Unavailable", shortError(error));
    }
  } finally {
    appState.loading[scope] = false;
    renderScope(scope);
  }
}

function renderScope(scope) {
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
      item.entity_id,
      item.friendly_name,
      item.state,
      item.integration,
      item.resolved_area_id,
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
    main.append(el("div", "row-title", item.entity_id));
    main.append(el("div", "row-subtitle", item.friendly_name || "No friendly name"));

    const details = el("div", "row-details");
    details.append(badge(item.domain));
    if (item.integration) details.append(badge(item.integration));
    if (item.resolved_area_id) details.append(badge(`area: ${item.resolved_area_id}`));
    if (item.device_id) details.append(badge("device linked"));

    const state = el("div", "state-pill", item.state ?? "unknown");
    row.append(main, details, state);
    fragment.append(row);
  });

  target.append(fragment);
}

function renderDevices() {
  const data = appState.data.devices || {};
  renderList("devices-list", data, (item) => ({
    title: item.name || item.device_id,
    subtitle: [item.manufacturer, item.model].filter(Boolean).join(" ") || item.device_id,
    badges: [
      `${formatValue(item.linked_entity_count)} entities`,
      item.area_id ? `area: ${item.area_id}` : null,
      ...(item.integrations || []),
    ],
  }));
  setCountText("devices-count", (data.items || []).length);
}

function renderAreas() {
  const data = appState.data.areas || {};
  renderList("areas-list", data, (item) => ({
    title: item.name || item.area_id,
    subtitle: item.area_id,
    badges: [`${formatValue(item.device_count)} devices`, `${formatValue(item.entity_count)} entities`],
  }));
  setCountText("areas-count", (data.items || []).length);
}

function renderIntegrations() {
  const data = appState.data.integrations || {};
  renderList("integrations-list", data, (item) => ({
    title: item.title || item.domain,
    subtitle: item.domain,
    badges: [
      item.kind,
      item.source,
      item.loaded_component ? "loaded" : null,
      `${formatValue(item.entry_count)} entries`,
      `${formatValue(item.entity_count)} entities`,
      `${formatValue(item.device_count)} devices`,
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

  RELATIONSHIP_SETS.forEach(([key, label]) => {
    const count = data.counts?.[key] || 0;
    const card = el("article", "metric-card compact");
    card.append(el("span", "metric-label", label));
    card.append(el("strong", "metric-value", formatValue(count)));
    summaryTarget.append(card);
  });

  RELATIONSHIP_SETS.forEach(([key, label, fields]) => {
    const rows = data[key] || [];
    const section = el("section", "relationship-set");
    const heading = el("div", "relationship-heading");
    heading.append(el("h3", "", label));
    heading.append(el("span", "badge muted", `${Math.min(rows.length, 80)} of ${rows.length}`));
    section.append(heading);

    const table = el("div", "relationship-table");
    rows.slice(0, 80).forEach((row) => {
      const line = el("div", "relationship-row");
      fields.forEach((field) => line.append(el("span", "", row[field] || "")));
      table.append(line);
    });
    section.append(table);
    listTarget.append(section);
  });
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
  const list = view.querySelector("[data-loading-target]");
  if (list) {
    list.textContent = "Loading";
  }
}

function setStatus(label, detail) {
  byId("data-state-label").textContent = label;
  byId("data-state-detail").textContent = detail;
}

function blockProtectedData(message) {
  appState.authBlocked = message;
  SCOPES.forEach((scope) => {
    appState.data[scope] = authBlockedPayload(scope);
  });
  setStatus("Auth required", "Protected data did not load");
  renderGlobalAuthFailure(message);
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
  target.textContent = "";
  return target;
}

function byId(id) {
  return appState.root.getElementById(id);
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function badge(text) {
  return el("span", "badge", text);
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
