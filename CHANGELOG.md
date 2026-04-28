# Changelog

## Unreleased

- Added post-rename HACS/Brands readiness documentation for the final `ha_context_explorer` domain.
- Added a local integration `brand/icon@2x.png` asset derived from the provisional project logo.
- Prepared an external Home Assistant Brands PR helper package under `docs/brands/home-assistant-brands/custom_integrations/ha_context_explorer/` with `icon.png` and `icon@2x.png`.
- Added `docs/releases/0.5.0.md` as a ready-to-paste GitHub Release draft for tag `0.5.0`.
- Added `docs/brands/home-assistant-brands/PR_BODY.md` as a ready-to-copy external Home Assistant Brands PR body.
- Updated HACS custom repository testing notes to use the new domain and to keep the HACS list/card icon pending until an external Home Assistant Brands PR exists.
- Kept integration version at `0.5.0` because this is docs/assets/distribution-readiness work with no runtime behavior change.

## 0.5.0

- Renamed the internal Home Assistant integration domain from `ha_context_explorer_probe` to `ha_context_explorer`.
- Renamed the integration folder from `custom_components/ha_context_explorer_probe` to `custom_components/ha_context_explorer`.
- Updated manifest domain, constants, panel path, static asset path, API base path, custom element name, lifecycle/wrapper recovery selectors, and Developer Workbench storage key to the final domain.
- Updated real data endpoints to `/api/ha_context_explorer/...`.
- Updated local brand assets to `custom_components/ha_context_explorer/brand/`.
- Added manual migration notes for removing the old probe-domain integration/folder and reinstalling the new domain.
- Updated the future Home Assistant Brands checklist to use `custom_integrations/ha_context_explorer/` and `https://brands.home-assistant.io/_/ha_context_explorer/icon.png`.
- Hardened native panel lifecycle recovery against duplicate current-domain `ha-context-explorer-panel` instances after Home Assistant navigation/rebind flows.
- Added duplicate-instance runtime diagnostics and rebinding protection so stale panel instances are removed and interaction handlers are rebuilt on active host/root adoption.
- Reconciled stale detached/waiting lifecycle status after live retesting showed a connected single-panel instance could still display `Waiting / Panel is detached`.
- Added connected-panel status diagnostics for lifecycle reconciliation while keeping genuine detached states visible.
- Kept read-only behavior, GET-only endpoints, admin-only access, implemented scopes, and payload shapes unchanged.
- Bumped the integration version to `0.5.0` because this is a breaking domain/path cleanup before external Brands work.

## 0.4.1 Distribution Readiness

- Added minimal HACS custom repository starter metadata with root `hacs.json`.
- Updated integration documentation and issue tracker metadata to point at `wdani/ha-context-explorer`.
- Clarified README installation and update paths for manual installs, HACS custom repository testing, and future release-based updates.
- Added the provisional HA Context Explorer logo to the README from `docs/assets/ha-context-explorer-logo.png`.
- Added derived provisional icon/logo assets for repo-local documentation and Home Assistant 2026.3+ local custom integration brand discovery.
- Switched the README logo image to an absolute raw GitHub URL after live HACS testing showed the previous relative image path was not rendered by HACS.
- Recorded live HACS custom repository observations, including successful custom repository acceptance/download availability, working Home Assistant integration UI icon display, pending HACS list/card icon validation, and an observed `styles.css` MIME warning.
- Added manual release/tag workflow guidance and a HACS custom repository test checklist.
- Refined HACS custom repository validation guidance to distinguish README/logo presentation, local integration brand assets, Home Assistant Brands, default-store submission, and future release/tag update testing.
- Kept integration version at `0.4.1` at the time because no Explorer runtime behavior changed.

## 0.4.1

- Polished the existing Developer Workbench foundation after live Home Assistant testing.
- Detects Clipboard API availability once and disables copy actions when unavailable instead of showing repeated per-click failures.
- Keeps Download JSON available when clipboard copy is unavailable.
- Aggregates repeated `scope_rendered` runtime events so the Runtime pane stays more readable while preserving useful fetch, auth, lifecycle, wrapper recovery, pane, and export events.
- Replaced the plain Workbench toggle text with a subtle icon affordance while keeping it admin-only and compact.
- Kept the Core Explorer / Developer Workbench / Dev Actions split, endpoint auth, GET-only behavior, read-only constraints, local-only exports, and existing scopes unchanged.
- Bumped the integration version to `0.4.1`.

## 0.4.0

- Added the first Developer Workbench foundation as a separate admin-only subsystem beside the normal Core Explorer UI.
- Added authenticated/admin-only `GET /api/ha_context_explorer_probe/workbench` for safe workbench metadata, privacy mask metadata, export schema metadata, persistence mode, and an empty Dev Actions contract.
- Added browser-local persistence only for the Workbench enabled flag; diagnostics, payloads, transcripts, and event history are not persisted.
- Added Review, Payload, Runtime, Privacy, and Actions panes with local-only copy/download utilities.
- Added semantic rendered review snapshots and transcripts with grouping, ordering, prominence, visibility, warning/limitation metadata, and export provenance.
- Added explicit provenance for exports: `current_live_rendered_state` versus `best_effort_active_view_snapshot`.
- Added a bounded runtime event log for lifecycle, fetch, render, wrapper recovery, auth block, and export events without storing full payload copies.
- Added privacy/masking diagnostics based on backend-owned mask metadata without exposing original masked values.
- Added a harmless Dev Actions placeholder plane for future guarded action contracts; no write actions are implemented.
- Kept existing scopes, endpoint auth/admin checks, GET-only behavior, source readers, read-only constraints, and Core Explorer display behavior intact.
- Updated visible product naming to **HA Context Explorer** while keeping the internal compatibility domain/path unchanged.
- Bumped the integration version to `0.4.0`.

## 0.3.3

- Added a focused recovery path for the live-observed case where Home Assistant leaves `ha-panel-custom` mounted but empty.
- Detects the active HA Context Explorer panel wrapper only on the explorer route and only when the explorer child element is missing.
- Remounts a single internal panel child and syncs `hass`, `panel`, `route`, and `narrow` from the Home Assistant wrapper.
- Avoids duplicate mounts by doing nothing when the explorer child already exists or when the wrapper is not empty.
- Adds a compact wrapper-level fallback if remounting fails.
- Kept endpoint URLs, authenticated/admin-only GET behavior, source readers, source coverage semantics, raw-ID toggle behavior, and read-only constraints unchanged.
- Bumped the integration version to `0.3.3`.

## 0.3.2

- Deepened native custom panel lifecycle recovery after the initial `0.3.1` hardening proved insufficient in live runtime testing.
- Adopted the active Home Assistant panel element from `hass` updates instead of returning early when stale global host/root state points to an old instance.
- Added shell integrity checks that rebuild missing or incomplete panel DOM instead of silently rendering into detached dummy nodes.
- Added visibility, page-restore, focus, and browser navigation recovery hooks that rebind the shell and render cached data without adding retry loops.
- Added a compact in-panel lifecycle notice/fallback with privacy-safe context for recovery or failure states.
- Kept endpoint URLs, authenticated/admin-only GET behavior, source readers, source coverage semantics, raw-ID toggle behavior, and read-only constraints unchanged.
- Bumped the integration version to `0.3.2`.

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
