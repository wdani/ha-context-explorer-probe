# AI Current State

## Version

`0.3.3`

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
- Documentation and review baseline

## Confirmed Runtime State

Previously confirmed in the user's Home Assistant runtime after the native custom panel auth bridge:

- The native custom panel loads successfully.
- The panel reports `Connected / Admin data endpoint available`.
- Overview loads real counts.
- Entities, devices, areas, integrations, and relationships load real items/link sets.
- The previous iframe-style invalid-auth failure is no longer the active observed behavior.

The `0.3.0` logic slice remains the current logic behavior. Version `0.3.1` added the first focused frontend lifecycle hardening pass. Live runtime testing showed that was not sufficient for all blank-screen cases, so version `0.3.2` deepened the recovery path: the frontend can adopt the active panel element from Home Assistant `hass` updates, rebuild a missing/incomplete shell, recover after visibility/page-restore/navigation-return hooks, and show compact in-panel lifecycle diagnostics instead of silently staying white. New live runtime evidence showed a stronger failure mode where `ha-panel-custom` remains mounted but empty with no probe child element; version `0.3.3` adds a route-specific wrapper recovery path that remounts the missing probe child once and syncs `hass`, `panel`, `route`, and `narrow` from the Home Assistant wrapper. This lifecycle fix has been statically validated in this sandbox; live confirmation still depends on the user's Home Assistant runtime.

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

## Remaining Validation Caveat

The native panel auth bridge is confirmed in the user's tested runtime. It is not yet guaranteed across every Home Assistant version, frontend build mode, or deployment topology. The 0.3.3 lifecycle hardening is intended to prevent blank panels after internal navigation, visibility return, remounts, stale host/root transitions, or an empty active `ha-panel-custom` wrapper, but live runtime confirmation remains separate from sandbox validation. If auth fails elsewhere, the UI still fails once and explains the protected-data failure without weakening endpoint auth.
