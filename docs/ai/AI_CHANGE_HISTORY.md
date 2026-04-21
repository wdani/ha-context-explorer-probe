# AI Change History

## 0.3.0

First logic/reference starter slice for Home Assistant context understanding.

Key changes:

- Added authenticated admin-only `GET /logic`.
- Added read-only parsing for canonical `automations.yaml` and `scripts.yaml`.
- Added best-effort entity and script reference extraction.
- Added compact automation, script, and entity usage summaries.
- Added structured `source_coverage` as the primary source-state surface.
- Added a Logic tab with visible source coverage and starter-slice exclusions.

Important boundaries kept:

- No service calls, mutation handlers, state changes, config writes, `.storage` access, secret access, token scraping, or persistent preferences were introduced.
- Packages, include-based layouts, dashboards, storage-only editor internals, full template dependency coverage, graph visualization, and execution tracing remain out of scope.
- Partial parsing returns successfully extracted items whenever possible and marks the affected source as partial or failed.
- Source identifiers are compact basenames such as `automations.yaml` and `scripts.yaml`, not absolute config paths.
- This is not a full Home Assistant logic graph.

## 0.2.3

Privacy/display refinement for the existing implemented scopes.

Key changes:

- Added display label fields beside existing raw identifiers.
- Updated default UI rendering to prefer masked, user-facing labels.
- Made relationships label-first and easier to scan without exposing long raw IDs by default.
- Added a session-only raw identifier reveal toggle.

Important boundaries kept:

- No new scopes were added.
- Endpoint auth/admin checks and GET-only behavior were unchanged.
- No persistent preferences, token hacks, service calls, or mutation paths were introduced.
- This improves default presentation and reduces raw identifier exposure; it is not full anonymization.

## 0.2.2

Focused follow-up for the panel-to-API auth bridge.

Key changes:

- Replaced iframe registration with Home Assistant `panel_custom` registration.
- Converted the frontend app into `ha-context-explorer-probe-panel`, a JavaScript module custom element.
- Switched protected data loading to `hass.callApi`, using the Home Assistant frontend auth context.
- Removed the unused `panel.html` request path.
- Kept admin-only backend endpoint checks unchanged.

Honest current state:

- This is the smallest safe bridge because Home Assistant custom panels receive the `hass` object and the frontend manages authentication for panel code.
- User runtime validation confirms the native panel loads protected data for overview, entities, devices, areas, integrations, and relationships.
- User runtime validation confirms the previous iframe-style invalid-auth failure is no longer the active observed behavior.
- If auth still fails in a runtime, the UI keeps the one-shot protected-data failure state and endpoint auth remains protected.
- Compatibility is confirmed in the user's tested Home Assistant runtime, not universally guaranteed across every HA runtime.

## 0.2.2 documentation alignment

After successful local Home Assistant runtime validation, documentation and review artifacts were aligned to record the working native panel auth bridge.

Recorded observations:

- Panel showed `Connected / Admin data endpoint available`.
- Overview loaded real counts.
- Entities, devices, areas, integrations, and relationships loaded real data.
- The earlier iframe invalid-auth behavior was no longer observed in the tested runtime.

No code behavior, endpoint security, data shaping, privacy model, or frontend architecture was changed in this documentation alignment step.

## 0.2.1

Focused follow-up for live-runtime panel issues.

Key changes:

- Loaded and prepared `panel.html` once during setup via Home Assistant executor work.
- Served cached panel HTML from memory in the request handler.
- Kept real JSON endpoints authenticated and admin-only.
- Added global frontend handling for 401/403 protected-data failures so the panel stops further protected endpoint requests after the first auth failure.

Honest current state:

- This does not weaken endpoint auth to make iframe loading easier.
- If the iframe runtime cannot pass an acceptable auth context, the UI explains that protected data is unavailable.
- A fuller auth bridge remains future work unless a safe Home Assistant-supported panel path is chosen.

## 0.2.0

Phase 2 turned the starter into a first real read-only explorer slice.

Key changes:

- Added authenticated admin-only GET endpoints for overview, entities, devices, areas, integrations, and relationships.
- Added a backend shaping layer so the UI consumes stable compact JSON instead of raw Home Assistant objects.
- Added mask-first privacy helpers for obvious IPv4, MAC, and Wi-Fi-context strings.
- Replaced the placeholder panel with tabbed views and honest auth/unavailable handling.
- Added project docs, changelog, and review bundle.

Important boundaries kept:

- no service calls
- no mutation endpoints
- no Home Assistant config writes
- no `.storage` reads or writes
- no secret access
- no copied local reference data

## 0.1.1

The placeholder panel temporarily allowed unauthenticated booting because no real Home Assistant data was exposed. That is no longer acceptable for real data endpoints.

## 0.1.0

Initial standalone custom integration and panel scaffold.
