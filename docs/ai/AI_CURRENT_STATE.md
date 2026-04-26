# AI Current State

## Version

`0.4.1`

## Implemented

- Native Home Assistant custom integration scaffold
- Single-instance config flow
- Native custom sidebar panel
- Static frontend bundle
- GET-only real data endpoints for:
  - overview
  - entities
  - devices
  - areas
  - integrations
  - relationships
  - logic
- Admin-only enforcement for JSON data endpoints
- Compact backend shaping layer
- First read-only logic/reference shaping layer
- Best-effort masking for selected sensitive string patterns
- Tabbed frontend views with entity search/domain filtering
- Frontend API loading through the Home Assistant `hass.callApi` panel context
- Label-first default display for entities, devices, areas, integrations, and relationships
- Logic tab with source coverage, automation/script summaries, and entity usage summaries
- Session-only raw identifier reveal toggle
- Global frontend protected-data failure state for 401/403 auth failures
- Native custom panel lifecycle and empty-wrapper recovery hardening for reconnect/remount/internal navigation/visibility-return cases
- Developer Workbench foundation with admin-only enablement, browser-local enabled-state persistence, Review/Payload/Runtime/Privacy/Actions panes, semantic rendered review exports, transcript exports, sanitized payload inspection, privacy/masking diagnostics, bounded runtime event log, and a placeholder Dev Actions plane
- Live-test Workbench polish for clipboard-unavailable handling, aggregated repeated render events, and a subtler admin-only Workbench toggle icon
- Minimal HACS custom repository starter metadata and clearer manual/HACS/update documentation
- Documentation and review baseline

## Confirmed Runtime State

Previously confirmed in the user's Home Assistant runtime after the native custom panel auth bridge:

- The native custom panel loads successfully.
- The panel reports `Connected / Admin data endpoint available`.
- Overview loads real counts.
- Entities, devices, areas, integrations, and relationships load real items/link sets.
- The previous iframe-style invalid-auth failure is no longer the active observed behavior.

The `0.3.0` logic slice remains the current logic behavior. Version `0.3.1` added the first focused frontend lifecycle hardening pass. Live runtime testing showed that was not sufficient for all blank-screen cases, so version `0.3.2` deepened the recovery path: the frontend can adopt the active panel element from Home Assistant `hass` updates, rebuild a missing/incomplete shell, recover after visibility/page-restore/navigation-return hooks, and show compact in-panel lifecycle diagnostics instead of silently staying white. New live runtime evidence showed a stronger failure mode where `ha-panel-custom` remains mounted but empty with no HA Context Explorer child element; version `0.3.3` adds a route-specific wrapper recovery path that remounts the missing child once and syncs `hass`, `panel`, `route`, and `narrow` from the Home Assistant wrapper. This lifecycle fix has been statically validated in this sandbox; live confirmation still depends on the user's Home Assistant runtime.

Version `0.4.0` adds the first Developer Workbench foundation. It is a separate admin-only developer-facing subsystem, disabled by default, with only the enabled/disabled flag persisted in browser-local storage. It does not add new explorer scopes, backend source readers, write behavior, or persistent Core Explorer settings. Export artifacts are local-only and explicitly identify whether they come from current live rendered state or a best-effort active-view snapshot.

Version `0.4.1` is a small live-test polish pass on that foundation. Clipboard copy actions are disabled with a calm central note when the Clipboard API is unavailable, Download JSON remains available, repeated `scope_rendered` runtime events are aggregated, and the Workbench toggle uses a subtle icon. It does not change backend scope, endpoint auth, exports, persistence, or the Dev Actions placeholder contract.

The distribution-readiness starter adds root HACS metadata and documentation cleanup without changing runtime behavior or bumping the integration version. It prepares for HACS custom repository testing and a future GitHub release-based update path, but does not create a release, tag, release automation, or default-store submission.

## Not implemented

- Floors full implementation
- Labels full implementation
- Dashboards full implementation
- Packages and include-based logic layouts
- Storage-only editor internals
- Full template dependency coverage
- Deep YAML or logic graphing
- Graph visualization or execution tracing
- Service exploration beyond future planning
- Write settings or saved preferences
- Any mutation feature
- Real Dev Actions or write-capable developer tools
- Remote diagnostic upload, Sentry submission, GitHub submission, screenshots, official/default HACS submission, full release automation, or completed update-channel work

## Remaining Validation Caveat

The native panel auth bridge is confirmed in the user's tested runtime. It is not yet guaranteed across every Home Assistant version, frontend build mode, or deployment topology. The 0.3.3 lifecycle hardening is intended to prevent blank panels after internal navigation, visibility return, remounts, stale host/root transitions, or an empty active `ha-panel-custom` wrapper, but live runtime confirmation remains separate from sandbox validation. The 0.4.0 Developer Workbench foundation was broadly successful in live testing, and 0.4.1 addresses the observed clipboard and runtime-log polish items. If auth fails elsewhere, the UI still fails once and explains the protected-data failure without weakening endpoint auth.
