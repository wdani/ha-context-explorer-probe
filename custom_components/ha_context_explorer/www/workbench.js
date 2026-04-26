export const PRODUCT_NAME = "HA Context Explorer";
export const WORKBENCH_STORAGE_KEY = "ha_context_explorer.developer_workbench.enabled";
export const WORKBENCH_EXPORT_SCHEMA = "developer_workbench_bundle/v1";
export const WORKBENCH_EVENT_LIMIT = 80;

const SENSITIVE_KEY_RE = /\b(token|secret|password|passwd|api[_-]?key|authorization|bearer|refresh|credential)\b/i;
const ABSOLUTE_PATH_RE = /([A-Za-z]:\\[^\s"'<>]+|\/(?:config|home|mnt|media|share|ssl|tmp|usr|var)\/[^\s"'<>]+)/g;

export function readWorkbenchEnabled() {
  try {
    return window.localStorage.getItem(WORKBENCH_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

export function persistWorkbenchEnabled(enabled) {
  try {
    window.localStorage.setItem(WORKBENCH_STORAGE_KEY, enabled ? "true" : "false");
    return true;
  } catch (_error) {
    return false;
  }
}

export function sanitizeForWorkbench(value, path = "$") {
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeForWorkbench(item, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const result = {};
    Object.entries(value).forEach(([key, itemValue]) => {
      const keyText = String(key);
      if (SENSITIVE_KEY_RE.test(keyText)) {
        result[keyText] = "[redacted-sensitive-field]";
      } else {
        result[keyText] = sanitizeForWorkbench(itemValue, `${path}.${keyText}`);
      }
    });
    return result;
  }

  return sanitizeString(String(value));
}

export function sanitizeString(value) {
  return String(value).replace(ABSOLUTE_PATH_RE, "[masked-path]");
}

export function compactForLog(detail = {}) {
  const compact = {};
  Object.entries(detail).forEach(([key, value]) => {
    if (SENSITIVE_KEY_RE.test(key)) {
      compact[key] = "[redacted-sensitive-field]";
    } else if (typeof value === "string") {
      compact[key] = sanitizeString(value).slice(0, 160);
    } else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      compact[key] = value;
    } else if (Array.isArray(value)) {
      compact[key] = `array(${value.length})`;
    } else if (value && typeof value === "object") {
      compact[key] = "object";
    }
  });
  return compact;
}

export function buildPayloadSummary(payload, scope) {
  const safePayload = sanitizeForWorkbench(payload || {});
  const rootFields = Object.keys(safePayload || {}).sort();
  const collectionKeys = collectionKeysForScope(scope, safePayload);
  const collections = collectionKeys.map((key) => fieldCoverageForCollection(key, safePayload[key]));

  return {
    scope,
    root_fields: rootFields.map((field) => ({ field, present: safePayload[field] !== undefined })),
    collections,
    payload: safePayload,
  };
}

function collectionKeysForScope(scope, payload) {
  if (scope === "relationships") {
    return ["entity_to_device", "entity_to_area", "entity_to_integration", "device_to_area", "device_to_integration"];
  }
  if (scope === "logic") {
    return ["source_coverage", "automations", "scripts", "entity_references", "warnings"];
  }
  if (Array.isArray(payload?.items)) {
    return ["items", "warnings"];
  }
  return Object.keys(payload || {}).filter((key) => Array.isArray(payload[key]));
}

function fieldCoverageForCollection(key, value) {
  const items = Array.isArray(value) ? value : [];
  const fieldCounts = {};
  items.forEach((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      Object.keys(item).forEach((field) => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });
    }
  });

  return {
    key,
    count: items.length,
    fields: Object.keys(fieldCounts)
      .sort()
      .map((field) => ({
        field,
        present_count: fieldCounts[field],
        missing_count: Math.max(0, items.length - fieldCounts[field]),
      })),
  };
}

export function buildMaskSummary(sources, maskTokens = {}) {
  const tokens = Object.keys(maskTokens || {});
  const summary = tokens.map((token) => ({
    token,
    reason: maskTokens[token]?.reason || "masked_value",
    description: maskTokens[token]?.description || "Masked value.",
    count: 0,
    locations: [],
  }));
  const byToken = Object.fromEntries(summary.map((item) => [item.token, item]));

  Object.entries(sources || {}).forEach(([source, value]) => {
    scanMaskTokens(value, `$/${source}`, tokens, byToken);
  });

  return {
    total_masked_values: summary.reduce((total, item) => total + item.count, 0),
    tokens: summary,
  };
}

function scanMaskTokens(value, path, tokens, byToken) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === "string") {
    tokens.forEach((token) => {
      if (value.includes(token)) {
        byToken[token].count += 1;
        if (byToken[token].locations.length < 40) {
          byToken[token].locations.push(path);
        }
      }
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => scanMaskTokens(item, `${path}[${index}]`, tokens, byToken));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, itemValue]) => scanMaskTokens(itemValue, `${path}.${key}`, tokens, byToken));
  }
}

export function buildExportBundle({ appState, workbenchState, payloadSummary, privacySummary, provenance }) {
  return {
    schema: WORKBENCH_EXPORT_SCHEMA,
    product_name: PRODUCT_NAME,
    generated_at: new Date().toISOString(),
    provenance,
    active_scope: appState.activeScope,
    route: routeSummary(appState.route),
    modes: {
      raw_identifiers: Boolean(appState.showRawIds),
      workbench_enabled: Boolean(workbenchState.enabled),
      auth_blocked: Boolean(appState.authBlocked),
    },
    rendered_review: sanitizeForWorkbench(workbenchState.reviewSnapshot || {}),
    transcript: workbenchState.transcript || "",
    payload_summary: payloadSummary,
    privacy_summary: privacySummary,
    runtime: sanitizeForWorkbench({
      loading: appState.loading,
      lifecycle: appState.lifecycle,
      last_successful_loads: workbenchState.lastSuccessfulLoads,
      events: workbenchState.events,
    }),
    dev_actions: sanitizeForWorkbench(workbenchState.metadata?.dev_actions || {}),
  };
}

export function buildProvenance({ appState, workbenchState, liveRendered }) {
  const caveats = [];
  if (!liveRendered) {
    caveats.push("Rendered DOM was not fully available; export was generated from cached active-view state.");
  }
  if (appState.lifecycle?.lastFailure) {
    caveats.push(`Last lifecycle failure: ${sanitizeString(appState.lifecycle.lastFailure)}`);
  }
  if (appState.lifecycle?.lastRecovery) {
    caveats.push(`Last lifecycle recovery: ${sanitizeString(appState.lifecycle.lastRecovery)}`);
  }
  if (appState.authBlocked) {
    caveats.push("Protected data access is currently blocked.");
  }

  return {
    kind: liveRendered ? "current_live_rendered_state" : "best_effort_active_view_snapshot",
    generated_at: new Date().toISOString(),
    active_scope: appState.activeScope,
    route: routeSummary(appState.route),
    raw_identifiers: Boolean(appState.showRawIds),
    workbench_enabled: Boolean(workbenchState.enabled),
    caveats,
  };
}

export function buildTranscript(bundle) {
  const review = bundle.rendered_review || {};
  const lines = [
    `${PRODUCT_NAME} Workbench Transcript`,
    `Provenance: ${bundle.provenance.kind}`,
    `Generated: ${bundle.generated_at}`,
    `Active scope: ${bundle.active_scope}`,
    `Raw identifiers: ${bundle.modes?.raw_identifiers ? "on" : "off"}`,
    "",
    `Page: ${review.page_title || bundle.active_scope || "Unknown"}`,
  ];

  (review.notices || []).forEach((notice) => lines.push(`Notice [${notice.kind || "info"}]: ${notice.title || notice.text || ""}`));
  (review.sections || []).forEach((section) => {
    lines.push("");
    lines.push(`## ${section.title || section.id || "Section"} (${section.prominence || "secondary"})`);
    (section.items || []).forEach((item) => {
      const title = item.title || item.label || item.text || item.type || "Item";
      const badges = item.badges?.length ? ` [${item.badges.join(", ")}]` : "";
      lines.push(`- ${title}${badges}`);
      if (item.subtitle) lines.push(`  ${item.subtitle}`);
      if (item.body) lines.push(`  ${item.body}`);
    });
    if (section.truncation) {
      lines.push(`- Truncation: ${section.truncation.visible} of ${section.truncation.total}`);
    }
  });

  if (bundle.provenance.caveats?.length) {
    lines.push("");
    lines.push("Caveats:");
    bundle.provenance.caveats.forEach((caveat) => lines.push(`- ${caveat}`));
  }

  return lines.join("\n");
}

export function routeSummary(route) {
  if (!route || typeof route !== "object") {
    return {};
  }
  return sanitizeForWorkbench({
    path: route.path,
    prefix: route.prefix,
    tail: route.tail,
  });
}

export async function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard API is unavailable in this browser context.");
  }
  await navigator.clipboard.writeText(text);
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body?.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
