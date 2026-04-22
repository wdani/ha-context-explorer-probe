# Changelog

## 0.3.1

- Hardened the native custom panel lifecycle against Home Assistant internal navigation, remount, and reconnect cases.
- Rebuilt or rebound the active shadow-root shell without relying on stale global host/root references.
- Cleared stale frontend host/root pointers when the panel element disconnects while preserving session data and the raw-ID toggle state.
- Guarded custom element registration so repeated module evaluation does not throw a duplicate-definition error.
- Added safe UI guards for async data responses that complete while the panel is detached.
- Added a visible lifecycle fallback instead of leaving a blank panel if shell restoration fails.
- Kept all existing scopes, authenticated/admin-only GET endpoints, source coverage semantics, and read-only behavior unchanged.
- Bumped the integration version to `0.3.1`.

## 0.3.0

- Added the first read-only `logic` scope for automation/script reference exploration.
- Added authenticated/admin-only `GET /api/ha_context_explorer_probe/logic`.
- Read only canonical `automations.yaml` and `scripts.yaml` through executor-safe file I/O.
- Added compact automation, script, and entity reference summaries.
- Added structured `source_coverage` with distinct parsed, missing, unsupported, failed, and partial states.
- Added a Logic tab with source coverage, summary cards, automation rows, script rows, and entity usage rows.
- Kept source identifiers compact with basenames only; absolute Home Assistant config paths are not returned.
- Kept warnings focused on non-duplicative caveats and preserved existing auth/read-only constraints.
- Bumped the integration version to `0.3.0`.

## 0.2.3

- Added non-breaking display label fields for entities, devices, areas, integrations, and relationships.
- Updated default frontend rendering to prefer masked, user-facing labels over raw internal identifiers.
- Refined the relationships view into label-first rows while preserving relationship counts and summaries.
- Added a session-only `Show raw identifiers` toggle for debugging without persistent preferences.
- Kept existing authenticated/admin-only GET endpoints, read-only behavior, and implemented scopes unchanged.
- Bumped the integration version to `0.2.3`.

## 0.2.2

- Replaced the iframe panel registration with Home Assistant's native custom panel registration.
- Converted the frontend to a custom element JavaScript module that receives the Home Assistant `hass` object.
- Switched protected JSON requests from raw same-origin `fetch` to `hass.callApi`.
- Removed the unused panel HTML request path while keeping the existing no-spam 401/403 failure state.
- Kept all real JSON endpoints authenticated and admin-only.
- Confirmed in the user's tested Home Assistant runtime that the native panel loads protected data for overview, entities, devices, areas, integrations, and relationships.
- Confirmed the previous iframe-style invalid-auth failure is no longer the active observed behavior in the tested runtime.
- Bumped the integration version to `0.2.2`.

## 0.2.1

- Removed blocking per-request `panel.html` file reads by loading and preparing the panel HTML once during setup.
- Kept all real JSON data endpoints authenticated and admin-only.
- Improved panel auth failure handling so a 401/403 from protected data endpoints becomes one clear UI state instead of repeated failing requests.
- Documented that iframe auth constraints may still require live-runtime follow-up; endpoint auth was not weakened.

## 0.2.0

- Replaced placeholder status/capabilities API responses with real read-only explorer endpoints for overview, entities, devices, areas, integrations, and relationships.
- Added authenticated, admin-only access checks for real Home Assistant data surfaces.
- Added compact backend shaping for Home Assistant state machine, registries, config entries, loaded components, and first relationship sets.
- Added best-effort mask-first privacy handling for obvious IPv4, MAC, and Wi-Fi-context values.
- Replaced the placeholder panel with tabbed views, overview counts, warnings, entity search/filtering, compact lists, and relationship summaries.
- Added lightweight AI/project documentation and a review bundle baseline.
- Bumped integration version metadata to `0.2.0`.

## 0.1.1

- Temporarily allowed the placeholder panel and placeholder demo endpoints to boot without Home Assistant auth.
- Kept the scaffold GET-only and read-only while no real Home Assistant data was exposed.

## 0.1.0

- Created the initial custom integration skeleton, sidebar panel shell, static assets, and minimal config flow.
