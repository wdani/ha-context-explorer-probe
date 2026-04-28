# AI Change History

## Post-rename Brands/HACS readiness

Distribution/branding validation after the `0.5.0` domain rename.

Key changes:

- Verified the active repository layout uses one integration under `custom_components/ha_context_explorer/`.
- Added `custom_components/ha_context_explorer/brand/icon@2x.png` from the existing provisional project logo.
- Prepared an external Home Assistant Brands helper package at `docs/brands/home-assistant-brands/custom_integrations/ha_context_explorer/` with `icon.png` and `icon@2x.png`.
- Added `docs/releases/0.5.0.md` as the ready-to-paste GitHub Release draft for tag `0.5.0`.
- Added `docs/brands/home-assistant-brands/PR_BODY.md` as the ready-to-copy external Home Assistant Brands PR body.
- Updated README HACS custom repository testing, Home Assistant Brands follow-up, and release/tag workflow notes for the final `ha_context_explorer` domain.
- Recorded that the HACS list/card icon remains pending until an external `home-assistant/brands` PR adds `custom_integrations/ha_context_explorer/icon.png`.

Important boundaries kept:

- No Explorer runtime behavior, Developer Workbench behavior, API path, auth/admin checks, service calls, mutation endpoints, `.storage` access, telemetry, release/tag creation, GitHub Release creation, HACS default-store submission, or external Brands PR was added.
- No version bump was made; the integration remains `0.5.0`.

## 0.5.0

Breaking early-project domain cleanup before external Home Assistant Brands work.

Key changes:

- Renamed the integration folder from `custom_components/ha_context_explorer_probe/` to `custom_components/ha_context_explorer/`.
- Changed the manifest domain and constants from `ha_context_explorer_probe` to `ha_context_explorer`.
- Changed the panel custom element from `ha-context-explorer-probe-panel` to `ha-context-explorer-panel`.
- Changed API paths, panel/static paths, frontend `hass.callApi` scope base, lifecycle/wrapper recovery selectors, local brand asset paths, and the Developer Workbench browser-local enabled flag to the new domain.
- Updated manual install, manual migration, HACS checklist, and future Home Assistant Brands checklist for the new domain.
- Hardened the native panel lifecycle against duplicate current-domain panel instances after live testing found `newPanelCount: 2`.
- Added lifecycle status reconciliation after follow-up live testing showed a connected single-panel instance could still display a stale detached/waiting status.
- Bumped the integration version to `0.5.0`.

Important boundaries kept:

- This is not backward-compatible with existing old-domain installs.
- Existing `ha_context_explorer_probe` config entries may not migrate automatically.
- No Explorer scopes, payload shapes, parser coverage, service calls, mutation endpoints, `.storage` access, telemetry, or write-capable Dev Actions were added.
- Historical references to the old probe domain remain only where they describe prior versions or old validation records.

## Distribution-readiness starter

First small step toward cleaner installation/update distribution.

Key changes:

- Added root `hacs.json` with the HA Context Explorer display name and README rendering.
- Added the provisional HA Context Explorer logo to the README from `docs/assets/ha-context-explorer-logo.png`.
- Added a derived docs icon and local custom integration brand assets from the existing provisional logo:
  - `docs/assets/ha-context-explorer-icon.png`
  - `custom_components/ha_context_explorer_probe/brand/icon.png`
  - `custom_components/ha_context_explorer_probe/brand/logo.png`
- Switched the README logo from a relative path to a raw GitHub URL after live HACS testing showed the relative image did not render.
- Recorded live HACS custom repository observations: the custom repository can be added, is available for download, README text renders, the Home Assistant integration/repairs UI shows the local icon, and the HACS list/card icon remains pending validation.
- Recorded the observed browser console `styles.css` MIME warning as a caveat; no stale unused stylesheet reference was found in this pass.
- Updated integration manifest documentation and issue tracker URLs to `wdani/ha-context-explorer`.
- Clarified README manual install, HACS custom repository test path, manual updates, and future GitHub-release-based update direction.
- Added a manual HACS custom repository test checklist.
- Added a future release/tag workflow checklist.
- Recorded that HACS readiness is a starter posture, not full default-store, Home Assistant Brands, guaranteed icon-display, or release-channel completion.

Important boundaries kept:

- No runtime code behavior changed.
- No version bump was made; the integration remains `0.4.1`.
- No GitHub release, tag, release automation, complete HACS brand asset validation across target runtimes, Home Assistant Brands submission, HACS default-store submission, backend source expansion, UI feature, Dev Actions implementation, telemetry, or write behavior was added.

## 0.4.1

Targeted live-test polish for the Developer Workbench foundation.

Key changes:

- Clipboard availability is detected once in the panel runtime.
- Copy actions are disabled with a central non-alarming note when the Clipboard API is unavailable.
- Download JSON remains available when clipboard copy is unavailable.
- Repeated `scope_rendered` runtime events are aggregated into a compact count instead of filling the Runtime pane with identical render rows.
- The admin-only Workbench toggle now uses a subtle icon affordance instead of plain text.

Important boundaries kept:

- No backend source readers, explorer scopes, endpoint URLs, auth/admin checks, service calls, mutation handlers, state changes, `.storage` access, secret access, token scraping, persistent settings beyond the existing Workbench enabled flag, remote uploads, or write-capable Dev Actions were introduced.
- This is polish on the existing 0.4.0 Workbench foundation, not a new subsystem step.

## 0.4.0

Developer Workbench foundation.

Key changes:

- Added a separate admin-only Developer Workbench beside the normal Core Explorer UI.
- Added authenticated admin-only `GET /workbench` metadata for version, availability, export schema, persistence mode, privacy mask metadata, and an empty Dev Actions capability contract.
- Added browser-local persistence for only the Workbench enabled flag.
- Added Review, Payload, Runtime, Privacy, and Actions panes.
- Added semantic rendered review snapshots and rendered text transcripts for AI/UI review.
- Added export provenance so artifacts state whether they represent `current_live_rendered_state` or `best_effort_active_view_snapshot`.
- Added local-only copy/download utilities for review bundles, transcripts, sanitized payloads, and richer Workbench JSON bundles.
- Added a bounded runtime event log with compact metadata for lifecycle, wrapper recovery, fetch, render, auth block, and export events.
- Added privacy/masking diagnostics aligned with backend mask metadata.
- Added a placeholder Dev Actions plane for future guarded actions; no write actions are implemented.
- Updated visible product naming to HA Context Explorer while keeping the internal compatibility domain/path unchanged.

Important boundaries kept:

- No new explorer scopes, backend source readers, service calls, mutation handlers, state changes, config writes, `.storage` access, secret access, token scraping, remote uploads, Sentry/GitHub submission, HACS/update-channel work, or persistent Core Explorer preferences were introduced.
- The Workbench is a foundation for diagnostics, review, and AI-assisted UI/UX analysis, not a finished developer system.

## 0.3.3

Focused follow-up for the live-observed empty `ha-panel-custom` wrapper failure mode.

Key changes:

- Added a global, route-specific recovery path that can run even when the HA Context Explorer child element is no longer present in the active DOM.
- Detects the matching `ha-panel-custom` wrapper only when the current route and registered panel match this integration.
- Remounts one missing child element when the wrapper is empty, then syncs `hass`, `panel`, `route`, and `narrow` from the Home Assistant wrapper.
- Avoids duplicate mounts by doing nothing when the child already exists or the wrapper is not empty.
- Added a wrapper-level visible fallback if remounting fails.
- Bumped the frontend/cache version to `0.3.3`.

Important boundaries kept:

- No endpoint URLs, auth checks, admin-only enforcement, backend data shaping, source readers, service calls, mutation handlers, config writes, `.storage` access, secret access, token scraping, persistent preferences, or new explorer scopes changed.
- This hardens the newly diagnosed empty-wrapper path. Live Home Assistant confirmation is still required before calling the blank-screen issue fully solved.

## 0.3.2

Focused follow-up for blank-screen states that could still occur after the first lifecycle hardening pass.

Key changes:

- Adopted the current Home Assistant panel element during `hass` updates instead of returning early when global host/root state is stale.
- Added stricter shell integrity checks so missing panel targets trigger shell rebuild/fallback instead of silent rendering into detached dummy nodes.
- Added visibility return, page restore, focus, hash, and history navigation recovery hooks.
- Added compact in-panel lifecycle recovery/failure diagnostics.
- Bumped the frontend/cache version to `0.3.2`.

Important boundaries kept:

- No endpoint URLs, auth checks, admin-only enforcement, backend data shaping, source readers, service calls, mutation handlers, config writes, `.storage` access, secret access, token scraping, persistent preferences, or new explorer scopes changed.
- This is still a frontend lifecycle bugfix. Live Home Assistant confirmation is required before calling the blank-screen issue fully solved.

## 0.3.1

Focused native custom-panel lifecycle robustness pass.

Key changes:

- Made panel shell initialization reentrant for reconnect, remount, and internal Home Assistant navigation cases.
- Stopped relying on stale global host/root references after the custom element disconnects.
- Guarded custom element registration against duplicate-definition errors if the frontend module is evaluated again.
- Added UI guards so async protected-data responses that finish while the panel is detached do not throw into a missing shadow root.
- Added a visible lifecycle fallback if shell restoration fails before the explorer UI can be rebuilt.

Important boundaries kept:

- No endpoint URLs, auth checks, admin-only enforcement, backend data shaping, source readers, service calls, mutation handlers, config writes, `.storage` access, secret access, token scraping, or persistent preferences changed.
- This is a lifecycle bugfix, not HACS/update-channel work and not an expansion of the 0.3.0 logic starter slice.

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
