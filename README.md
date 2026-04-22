# HA Context Explorer Probe

A separate experimental Home Assistant custom integration with its own sidebar UI.

This is **not** a continuation of `ha-ai-context-exporter`. It is a clean probe for a different architecture direction:

- native Home Assistant custom integration
- custom sidebar panel UI
- strict read-only design
- GET-only data endpoints
- admin-only access for real Home Assistant data
- privacy-first defaults
- capability-based scope growth

## Current version

`0.3.0`

## Implemented scopes

The current `0.3.0` branch includes the first real read-only explorer slice plus the first logic/reference starter slice:

- Overview
- Entities
- Devices
- Areas
- Integrations
- Relationships
- Logic

The backend shapes data from Home Assistant readable in-memory sources:

- state machine
- entity registry
- device registry
- area registry
- config entries
- loaded component names
- canonical `automations.yaml`
- canonical `scripts.yaml`

The logic slice reads only canonical `automations.yaml` and `scripts.yaml` for first-pass automation/script references. It does not parse Home Assistant storage files, secrets, packages, include trees, dashboards, or local snapshots.

## API

All real data endpoints are `GET` only and require authenticated Home Assistant admin access:

- `/api/ha_context_explorer_probe/overview`
- `/api/ha_context_explorer_probe/entities`
- `/api/ha_context_explorer_probe/devices`
- `/api/ha_context_explorer_probe/areas`
- `/api/ha_context_explorer_probe/integrations`
- `/api/ha_context_explorer_probe/relationships`
- `/api/ha_context_explorer_probe/logic`

The sidebar now uses Home Assistant's native custom panel model instead of an iframe shell. The frontend is a JavaScript module custom element loaded by Home Assistant, receives the frontend `hass` object, and requests protected JSON through `hass.callApi`. Real JSON data remains protected separately by Home Assistant auth and an explicit admin check. If the frontend auth context still cannot reach the protected endpoints in a runtime, the UI shows one clear 401/403 state instead of weakening endpoint auth or repeatedly probing protected endpoints.

In the user's tested Home Assistant runtime for `0.2.2`, the native panel reports `Connected / Admin data endpoint available` and the implemented protected scopes load real data. This is a tested-runtime confirmation, not a guarantee for every Home Assistant version or deployment topology.

Version `0.2.3` refines the current views to prefer user-facing labels over raw internal identifiers by default. A session-only **Show raw identifiers** toggle can reveal technical IDs for debugging without saving preferences.

Version `0.3.0` adds the first logic/reference starter slice. The Logic tab shows source coverage directly, including parsed canonical files, missing canonical files, intentionally unsupported source types, parse failures, and partial parsing. This is a starter reference extractor, not a full Home Assistant logic graph or complete template dependency engine.

## Safety boundaries

The project remains strict read-only:

- no POST / PUT / PATCH / DELETE endpoints
- no service calls
- no state changes
- no restart controls
- no supervisor controls
- no writes to Home Assistant config
- no writes to `.storage`
- no secret access
- no persistent preferences

## Privacy

Responses use mask-first defaults for user-visible strings. Masking currently covers obvious IPv4-like values, MAC-like values, and Wi-Fi / SSID / BSSID contexts where safely detectable.

This masking is best-effort. It is not guaranteed anonymization, and users should still treat exported or copied data with care.

## Future scopes

Future phases may explore floors, labels, dashboards, services, and deeper logic relationships. Floors, labels, dashboards, service exploration, graph visualization, execution tracing, and full template dependency coverage are not implemented in `0.3.0`.

The current logic slice is intentionally partial. Future work may broaden coverage to packages, include-based layouts, dashboards, labels, floors, services, richer template analysis, graph visualization, and deeper execution/context modeling.

## Local reference material

The `_local_reference/` directory is ignored and is not repository source of truth. It may be used only as local shaping/reference material while keeping implementation generic for different Home Assistant installations.

Do not copy reference data into repository source files or docs.

## Installation

1. Copy `custom_components/ha_context_explorer_probe` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration from **Settings -> Devices & Services**.
4. Open **Context Explorer Probe** from the sidebar.

## Validation status

See `review_bundle.md` for the focused validation record for this phase. Local validation does not replace testing inside a live Home Assistant runtime.
