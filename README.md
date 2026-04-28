# HA Context Explorer

<p align="center">
  <img src="https://raw.githubusercontent.com/wdani/ha-context-explorer/main/docs/assets/ha-context-explorer-logo.png" alt="HA Context Explorer logo" width="180">
</p>

A separate experimental Home Assistant custom integration with its own sidebar UI.

This is **not** a continuation of `ha-ai-context-exporter`. It is a clean exploration of a different architecture direction:

- native Home Assistant custom integration
- custom sidebar panel UI
- strict read-only design
- GET-only data endpoints
- admin-only access for real Home Assistant data
- privacy-first defaults
- capability-based scope growth

## Current version

`0.5.0`

## Implemented scopes

The current `0.5.0` branch includes the first real read-only explorer slice, the first logic/reference starter slice, native-panel lifecycle/wrapper recovery hardening, the first Developer Workbench foundation, a small live-test polish pass for Workbench copy/runtime-log usability, and the breaking internal domain rename from the old probe-era integration domain to `ha_context_explorer`.

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

## Developer Workbench

Version `0.4.0` adds a clearly separated Developer Workbench foundation for admin-only diagnostics, UI/UX review, local exports, runtime lifecycle visibility, sanitized payload inspection, and privacy/masking inspection.

Version `0.4.1` keeps that foundation unchanged and polishes live-tested behavior: copy buttons now degrade calmly when the Clipboard API is unavailable, repeated render events are aggregated in the bounded runtime log, and the admin-only Workbench toggle uses a subtle icon affordance.

The Workbench is separate from the normal Core Explorer UI. It is disabled by default and can be enabled from a small admin-only topbar control. The enabled/disabled flag is stored only in browser-local storage so it survives reloads without adding Home Assistant writes or a settings system. Diagnostics, payloads, transcripts, and event history are not persisted.

Workbench exports are local-only copy/download artifacts. They include explicit provenance:

- `current_live_rendered_state` when generated from the currently mounted rendered view
- `best_effort_active_view_snapshot` when generated from cached active-view state because the live rendered view is unavailable, partially mounted, or recovering

The Workbench also includes a placeholder Dev Actions plane for future guarded developer actions, but no write-capable actions are implemented in this phase.

## API

All real data endpoints are `GET` only and require authenticated Home Assistant admin access:

- `/api/ha_context_explorer/overview`
- `/api/ha_context_explorer/entities`
- `/api/ha_context_explorer/devices`
- `/api/ha_context_explorer/areas`
- `/api/ha_context_explorer/integrations`
- `/api/ha_context_explorer/relationships`
- `/api/ha_context_explorer/logic`
- `/api/ha_context_explorer/workbench`

The sidebar now uses Home Assistant's native custom panel model instead of an iframe shell. The frontend is a JavaScript module custom element loaded by Home Assistant, receives the frontend `hass` object, and requests protected JSON through `hass.callApi`. Real JSON data remains protected separately by Home Assistant auth and an explicit admin check. If the frontend auth context still cannot reach the protected endpoints in a runtime, the UI shows one clear 401/403 state instead of weakening endpoint auth or repeatedly probing protected endpoints.

In the user's tested Home Assistant runtime for `0.2.2`, the native panel reports `Connected / Admin data endpoint available` and the implemented protected scopes load real data. This is a tested-runtime confirmation, not a guarantee for every Home Assistant version or deployment topology.

Version `0.2.3` refines the current views to prefer user-facing labels over raw internal identifiers by default. A session-only **Show raw identifiers** toggle can reveal technical IDs for debugging without saving preferences.

Version `0.3.0` adds the first logic/reference starter slice. The Logic tab shows source coverage directly, including parsed canonical files, missing canonical files, intentionally unsupported source types, parse failures, and partial parsing. This is a starter reference extractor, not a full Home Assistant logic graph or complete template dependency engine.

Version `0.3.1` started hardening the native custom panel frontend against Home Assistant internal navigation, reconnect, and remount cases that could otherwise leave a blank panel until a full browser reload. Version `0.3.2` deepened that recovery path by actively adopting the current panel host from Home Assistant `hass` updates, rebuilding a missing shell when integrity checks fail, adding visibility/page-restore recovery hooks, and showing compact in-panel lifecycle diagnostics if recovery cannot complete. Version `0.3.3` adds a focused recovery path for the live-observed case where Home Assistant leaves the custom panel wrapper mounted but empty, with no HA Context Explorer child element. Version `0.4.0` adds the Developer Workbench foundation without changing endpoint auth, data shaping, source readers, or read-only behavior. Version `0.5.0` renames the internal integration domain, folder, API path, panel path, static asset path, custom element, and Workbench storage key from the probe-era names to the final `ha_context_explorer` domain.

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
- no persistent Core Explorer preferences

## Privacy

Responses use mask-first defaults for user-visible strings. Masking currently covers obvious IPv4-like values, MAC-like values, and Wi-Fi / SSID / BSSID contexts where safely detectable.

This masking is best-effort. It is not guaranteed anonymization, and users should still treat exported or copied data with care.

## Future scopes

Future phases may explore floors, labels, dashboards, services, and deeper logic relationships. Floors, labels, dashboards, service exploration, graph visualization, execution tracing, and full template dependency coverage are not implemented in `0.5.0`.

The current logic slice is intentionally partial. Future work may broaden coverage to packages, include-based layouts, dashboards, labels, floors, services, richer template analysis, graph visualization, and deeper execution/context modeling.

## Distribution status

The repository is being prepared for a cleaner install/update path, but it should still be treated as an early custom integration.

Current distribution posture:

- manual installation remains supported
- HACS custom repository metadata is present as a starter step
- provisional local brand assets are present for repository and integration presentation
- post-rename repository structure uses one integration under `custom_components/ha_context_explorer/`
- live HACS testing before the domain rename confirmed the custom repository can be added and offered for download; post-rename HACS retesting should use the checklist below
- release-based updates with Git tags are the intended future direction
- no GitHub release or tag has been created by this distribution step
- this is not a HACS default-store submission
- full HACS compliance is not claimed yet; live HACS custom repository validation, validation automation, and release publishing still need a later pass

The logo at `docs/assets/ha-context-explorer-logo.png` is provisional placeholder branding for repository presentation. A smaller derived icon is also available at `docs/assets/ha-context-explorer-icon.png`.

The README logo uses an absolute raw GitHub URL because live HACS testing showed that HACS rendered the README text but did not resolve the previous relative image path.

The integration includes provisional local brand images at `custom_components/ha_context_explorer/brand/icon.png`, `custom_components/ha_context_explorer/brand/icon@2x.png`, and `custom_components/ha_context_explorer/brand/logo.png`. Home Assistant 2026.3 and newer can use local custom integration brand images from this `brand/` directory. In the tested Home Assistant runtime, the integration icon appeared in Home Assistant's integration/repairs UI before the domain rename; retest is required for the new `ha_context_explorer` domain.

A small external Home Assistant Brands PR helper package is prepared under `docs/brands/home-assistant-brands/custom_integrations/ha_context_explorer/`. It contains `icon.png` and `icon@2x.png` for a future external `home-assistant/brands` PR. That external PR has not been created.

The integration now uses the final internal domain and folder name `ha_context_explorer`. The old `ha_context_explorer_probe` domain remains historical only.

## Local reference material

The `_local_reference/` directory is ignored and is not repository source of truth. It may be used only as local shaping/reference material while keeping implementation generic for different Home Assistant installations.

Do not copy reference data into repository source files or docs.

## Installation

### Manual install

1. Copy `custom_components/ha_context_explorer` into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.
3. Add the integration from **Settings -> Devices & Services**.
4. Open **HA Context Explorer** from the sidebar.

### Manual migration from the old probe domain

Version `0.5.0` is an early-project breaking domain cleanup. Existing old-domain config entries may not migrate automatically.

1. Remove the old HA Context Explorer integration entry if one exists.
2. Remove the old `custom_components/ha_context_explorer_probe` folder from Home Assistant.
3. Install or copy the new `custom_components/ha_context_explorer` folder.
4. Restart Home Assistant.
5. Add **HA Context Explorer** again from **Settings -> Devices & Services**.
6. Clear browser cache if the old sidebar panel path or static assets still appear.

### HACS custom repository install

HACS custom repository support is being prepared, not presented as a finished official release channel yet.

Expected future/manual test path:

1. In HACS, open **Custom repositories**.
2. Add `https://github.com/wdani/ha-context-explorer`.
3. Select repository type **Integration**.
4. Install the integration if HACS accepts the repository.
5. Restart Home Assistant.
6. Add **HA Context Explorer** from **Settings -> Devices & Services**.

If the integration does not appear after installation, restart Home Assistant and clear the browser cache before retesting.

### HACS custom repository test checklist

Use this as a manual validation checklist before presenting HACS as a comfortable install path:

1. Remove any old HACS/custom integration install if present.
2. Confirm the old `custom_components/ha_context_explorer_probe` folder is gone.
3. Add `https://github.com/wdani/ha-context-explorer` as a HACS custom repository with category **Integration**.
4. Install or update the integration through HACS, then restart Home Assistant if required.
5. Confirm the integration and sidebar panel use `/ha_context_explorer`.
6. Confirm the panel reports version `0.5.0`.
7. Confirm whether the local Home Assistant integration icon appears from `custom_components/ha_context_explorer/brand/`.
8. Confirm HACS renders the README content and raw-GitHub README logo.
9. Confirm the HACS list/card icon status. It may still show "icon not available" until the external Home Assistant Brands path has `custom_integrations/ha_context_explorer/icon.png`.
10. Confirm Home Assistant logs and browser console do not show old `/ha_context_explorer_probe` paths.
11. Confirm Overview and at least one additional protected scope load for an admin user.
12. Confirm Developer Workbench remains admin-only and local-only.
13. Check whether HACS reports update information as expected for the current branch or a future release.
14. After a future GitHub Release exists, confirm HACS detects update availability from the release/tag path.

This checklist is for custom repository testing only. It is not a HACS default-store submission checklist.

### Future Home Assistant Brands PR checklist

This is an external follow-up for the central `home-assistant/brands` repository, not a change that can be completed only inside this repository.

- Use the final custom integration domain folder: `custom_integrations/ha_context_explorer/`.
- Prepared helper package in this repo: `docs/brands/home-assistant-brands/custom_integrations/ha_context_explorer/`.
- Add `icon.png` as a square `256x256` PNG derived from the project icon.
- Add `icon@2x.png` as a square `512x512` PNG.
- Add `logo.png` only if a true landscape/logo variant exists and meets Home Assistant Brands requirements; otherwise rely on icon fallback.
- Ensure images are PNG, trimmed, optimized, and not based on Home Assistant branded images.
- After merge and cache expiry, confirm `https://brands.home-assistant.io/_/ha_context_explorer/icon.png` returns the custom icon.
- Remember browser cache may last up to 7 days and CDN cache may last up to 24 hours.

## Updates

### Manual update

1. Replace the local `custom_components/ha_context_explorer` directory with the newer repository copy.
2. Restart Home Assistant.
3. Refresh the browser if the panel frontend still shows an older version.

### HACS and release-tag direction

The intended update direction is HACS custom repository usage backed by GitHub releases with version tags. HACS can use the default branch when releases are not published, but release-based updates should provide a cleaner user experience once the project is ready. Tags alone are not treated here as the finished update channel; a future release should publish a proper GitHub release.

Future release checklist:

- Confirm `main` is stable.
- Decide whether the change affects runtime, install behavior, or only docs/metadata.
- Bump the integration version only when the change justifies a user-visible release.
- Update `CHANGELOG.md`.
- Update `review_bundle.md` with validation results.
- Confirm `custom_components/ha_context_explorer/manifest.json` and `const.py` agree on the version.
- Run syntax, manifest, safety, and reference-data checks.
- Create tag `v0.5.0` or `0.5.0` only after deciding the tag naming convention.
- Create a GitHub Release from that tag with concise release notes.
- Test HACS custom repository install/update behavior against the release.

Not done yet:

- no GitHub release created
- no tag created
- no release automation added
- no HACS default-store submission
- no Home Assistant Brands submission
- no complete Home Assistant/HACS brand asset validation across supported runtime versions
- no claim of full HACS compliance across all current checks

## Validation status

See `review_bundle.md` for the focused validation record for this phase. Local validation does not replace testing inside a live Home Assistant runtime.
