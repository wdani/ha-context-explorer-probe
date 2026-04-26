# AI Project Context

## Project identity

HA Context Explorer is a separate experimental repository. It is not a continuation of `ha-ai-context-exporter`.

The project explores a native Home Assistant custom integration plus custom sidebar panel architecture for read-only context exploration. Version `0.5.0` finalizes the internal Home Assistant integration domain as `ha_context_explorer`; visible product naming remains HA Context Explorer.

## Direction

The project should remain:

- strict read-only
- GET-only for backend data endpoints
- admin-only for real Home Assistant data
- privacy-first by default
- capability-based rather than snapshot-specific
- honest about unavailable or not-yet-implemented scopes

## Source of truth

Repository files are the project source of truth. Local reference material under `_local_reference/` is not source of truth and must not be copied into source files or documentation.

## Current phase

Version `0.5.0` contains the first real explorer slice plus focused panel I/O, native custom-panel auth bridge fixes, privacy-first display refinement, the first logic/reference starter slice, deeper native panel lifecycle/wrapper recovery hardening, the first Developer Workbench foundation, a small live-test polish pass, and the breaking internal domain cleanup from the old probe-era name to `ha_context_explorer`:

- overview
- entities
- devices
- areas
- integrations
- relationships
- logic

The logic slice currently reads only canonical `automations.yaml` and `scripts.yaml` for best-effort automation/script/entity references. It exposes source coverage directly so users can see parsed, missing, unsupported, failed, and partial states.

The 0.3.1 lifecycle hardening was the first frontend robustness fix for Home Assistant internal navigation, reconnect, and remount cases. Live runtime testing showed that some blank-screen states could still occur, so 0.3.2 added stricter shell integrity recovery, active-host adoption from Home Assistant `hass` updates, visibility/page-restore recovery hooks, and compact in-panel lifecycle diagnostics. Live runtime inspection then showed that `ha-panel-custom` itself can remain mounted but empty with no HA Context Explorer child element, so 0.3.3 adds a focused wrapper remount recovery path. It does not expand data scope or change endpoint security.

The 0.4.0 Developer Workbench introduces a three-plane model:

- Core Explorer: normal read-only product UI.
- Developer Workbench: explicitly enableable, browser-local persistent, admin-only diagnostics/review/export inspector.
- Dev Actions plane: reserved placeholder contract for future guarded developer actions; no write actions are implemented in this phase.

Workbench exports are local-only artifacts and must state whether they represent `current_live_rendered_state` or a `best_effort_active_view_snapshot`. The runtime event log is a fixed-size ring buffer and must not store full unmasked payloads or raw secret values.

The 0.4.1 polish pass keeps that model intact while making clipboard-unavailable behavior calmer, aggregating repeated render events, and making the Workbench toggle slightly more icon-like without promoting it as a normal user feature.

The distribution-readiness starter adds minimal HACS custom repository metadata, provisional README logo/icon presentation, local integration brand assets, release/tag workflow guidance, a HACS custom repository test checklist, and installation/update documentation clarity. Live HACS testing confirmed custom repository acceptance, download availability, and README text rendering before the domain rename; the README logo now uses a raw GitHub URL because the earlier relative image did not render in HACS. Version `0.5.0` updates the future Brands path to `custom_integrations/ha_context_explorer/` and `https://brands.home-assistant.io/_/ha_context_explorer/icon.png`. This prepares for future HACS custom repository testing, Home Assistant 2026.3+ local custom integration brand discovery, and release-based updates, but it is not a default-store submission, Home Assistant Brands submission, release automation pass, guaranteed icon-display claim, or backward-compatible migration.

Future scope may include floors, labels, dashboards, services, package/include logic layouts, full template dependency coverage, graph visualization, and deeper execution/context modeling, but those remain planned and unavailable in this phase.
