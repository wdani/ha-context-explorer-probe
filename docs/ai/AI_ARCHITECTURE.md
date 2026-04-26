# AI Architecture

## Runtime shape

The integration registers:

- a Home Assistant native custom sidebar panel
- static frontend assets under `/local/ha_context_explorer_probe`
- seven authenticated admin-only data endpoints plus one authenticated admin-only workbench metadata endpoint under `/api/ha_context_explorer_probe`

The panel frontend is a JavaScript module custom element registered through `panel_custom`. Home Assistant passes the frontend `hass` object to the element. Real data access is enforced at the JSON endpoints.

## Backend data flow

The backend reads only Home Assistant in-memory data:

- `hass.states.async_all()`
- entity registry
- device registry
- area registry
- config entries
- loaded component names
- canonical `automations.yaml`
- canonical `scripts.yaml`

It shapes those sources into compact JSON contracts for overview, entities, devices, areas, integrations, relationships, and logic. It does not expose raw registry objects.

The logic scope is intentionally narrow. It reads only canonical automation and script YAML files, returns structured `source_coverage`, and does not read `.storage`, secrets, packages, include trees, dashboards, or broad config directories.

## Privacy layer

The privacy layer masks obvious sensitive string patterns before values are returned to the frontend. It currently covers:

- IPv4-like values
- MAC-like values
- Wi-Fi / SSID / BSSID contexts

Masking is best-effort and not guaranteed anonymization.

## Frontend data flow

The frontend calls each scope endpoint through `hass.callApi("GET", "ha_context_explorer_probe/<scope>")`. It does not hard-code browser storage token keys. If Home Assistant auth is unavailable to the custom panel runtime, the frontend records one global 401/403 protected-data failure and stops further endpoint requests for that page session.

The custom panel frontend treats lifecycle recovery as both a shell-integrity and wrapper-integrity problem. It can adopt the active Home Assistant panel host from `hass` updates, rebuild missing shell DOM when required targets disappear, retry shell restoration after visibility/page/navigation return hooks, and recover the live-observed case where the active `ha-panel-custom` wrapper is mounted but empty. Wrapper recovery is route-specific, only remounts the HA Context Explorer child when it is missing and the wrapper is empty, and syncs `hass`, `panel`, `route`, and `narrow` from Home Assistant. Recovery notices stay inside the panel and do not expose tokens, secrets, or filesystem paths.

The Logic tab renders source coverage before logic rows so users can distinguish parsed, missing, unsupported, failed, and partially parsed sources without reading docs first.

## Developer Workbench architecture

Version `0.4.0` separates the frontend into three conceptual planes:

- Core Explorer: the normal user-facing read-only explorer.
- Developer Workbench: an explicitly enabled admin-only inspector for review, payload, runtime, privacy, and export diagnostics.
- Dev Actions plane: a reserved capability contract for future dry-run/preview/confirmation-oriented developer actions. No write-capable actions are implemented.

The Workbench enabled flag is persisted in browser-local storage under `ha_context_explorer_probe.developer_workbench.enabled`. This avoids Home Assistant config writes or a broader settings system while making the mode truly survive reloads. No diagnostics history, backend payloads, transcripts, or event logs are persisted.

The desktop shell uses a right-side inspector beside the Core Explorer. Narrow screens use a fixed drawer/overlay style so the Core Explorer remains usable.

Workbench exports are local-only copy/download artifacts. Structured review bundles and text transcripts include explicit provenance: `current_live_rendered_state` when generated from the mounted rendered view, or `best_effort_active_view_snapshot` when generated from cached active-view state during recovery or partial mounting. The semantic rendered snapshot captures user-facing ordering, grouping, cards, rows, badges, warnings, caveats, empty states, notices, truncation, raw-ID mode effects, and prominence/visibility metadata where available.

Runtime diagnostics use a fixed-size ring buffer. Log entries are compact metadata only and must not include full unmasked payload copies, raw secrets, tokens, or absolute config paths. Repeated render events may be aggregated so the Runtime pane stays useful during normal Home Assistant focus/navigation churn.

## Capability model

Implemented scopes are exposed explicitly. Future scopes are reported as unavailable/not implemented rather than faked.

## Distribution posture

The repository keeps the standard custom integration layout under `custom_components/ha_context_explorer_probe/` and includes root HACS metadata as a custom-repository readiness starter. The runtime integration domain remains `ha_context_explorer_probe` for compatibility, while visible docs and UI use HA Context Explorer.

The intended future update path is HACS custom repository usage backed by GitHub releases with version tags. This is not yet a full release pipeline, default-store submission, or guarantee of complete HACS compliance.
