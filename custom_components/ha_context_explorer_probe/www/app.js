const API_PATH_BASE = "ha_context_explorer_probe";
const APP_VERSION = "0.3.0";
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
  initialized: false,
  activeScope: "overview",
  data: {},
  loading: {},
  authBlocked: null,
  entitySearch: "",
  entityDomain: "",
  showRawIds: false,
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
      bindRawToggle();
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
        <button class="tab-button" type="button" data-scope="logic">Logic</button>
        <label class="raw-toggle">
          <input id="raw-id-toggle" type="checkbox" />
          <span>Show raw identifiers</span>
        </label>
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

function bindRawToggle() {
  byId("raw-id-toggle").addEventListener("change", (event) => {
    appState.showRawIds = event.target.checked;
    renderScope(appState.activeScope);
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
  } else if (scope === "logic") {
    renderLogic();
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
  byId("logic-count").textContent = `${formatValue(counts.total_references)} refs across ${formatValue(counts.referenced_entities)} entities`;

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
    main.append(el("div", "row-subtitle", appState.showRawIds ? [item.id, item.entity_id].filter(Boolean).join(" / ") : item.source_file || ""));

    const details = el("div", "row-details");
    if (item.source_file) details.append(badge(item.source_file));
    if (item.mode) details.append(badge(`Mode: ${item.mode}`));
    if (kind === "automation" && item.enabled !== null && item.enabled !== undefined) {
      details.append(badge(item.enabled ? "Enabled" : "Disabled"));
    }
    const summary = item.summary || {};
    Object.entries(summary).forEach(([label, value]) => details.append(badge(`${humanizeIdentifier(label)}: ${formatValue(value)}`)));
    if (appState.showRawIds) {
      if (item.id) details.append(badge(`ID: ${item.id}`));
      if (item.entity_id) details.append(badge(`Entity: ${item.entity_id}`));
    }

    row.append(main, details);
    row.append(logicReferenceChips("Entities", item.referenced_entities || [], (entityId) => referenceLabel(entityId, referencesById), "No entity references"));
    row.append(logicReferenceChips("Scripts", item.referenced_script_ids || [], (scriptId) => scriptLabel(scriptId, scriptLabels), "No script references"));
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
    main.append(el("div", "row-subtitle", appState.showRawIds ? item.entity_id : `${formatValue(item.reference_count)} total reference(s)`));
    const details = el("div", "row-details");
    details.append(badge(`${formatValue(item.reference_count)} refs`));
    details.append(badge(`${formatValue((item.referenced_by_automations || []).length)} automations`));
    details.append(badge(`${formatValue((item.referenced_by_scripts || []).length)} scripts`));
    if (appState.showRawIds) {
      details.append(badge(`ID: ${item.entity_id}`));
    }
    row.append(main, details);
    target.append(row);
  });
}

function logicReferenceChips(label, values, formatter, emptyText) {
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
  return block;
}

function referenceLabel(entityId, referencesById) {
  const label = referencesById[entityId]?.display_name || entityFallback(entityId);
  return appState.showRawIds ? `${label} (${entityId})` : label;
}

function scriptLabel(scriptId, scriptLabels) {
  const label = scriptLabels[scriptId] || humanizeIdentifier(scriptId);
  return appState.showRawIds ? `${label} (script.${scriptId})` : label;
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
