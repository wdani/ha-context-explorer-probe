# AI Change History

## 0.2.2

Focused follow-up for the panel-to-API auth bridge.

Key changes:

- Replaced iframe registration with Home Assistant `panel_custom` registration.
- Converted the frontend app into `ha-context-explorer-probe-panel`, a JavaScript module custom element.
- Switched protected data loading to `hass.callApi`, using the Home Assistant frontend auth context.
- Removed the unused `panel.html` request path.
- Kept admin-only backend endpoint checks unchanged.

Honest current state:

- This is the smallest safe bridge candidate because Home Assistant custom panels receive the `hass` object and the frontend manages authentication for panel code.
- Local static validation cannot prove live Home Assistant behavior in this environment.
- If auth still fails in a runtime, the UI keeps the one-shot protected-data failure state and endpoint auth remains protected.

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
