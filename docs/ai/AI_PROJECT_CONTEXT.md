# AI Project Context

## Project identity

HA Context Explorer Probe is a separate experimental repository. It is not a continuation of `ha-ai-context-exporter`.

The probe explores a native Home Assistant custom integration plus custom sidebar panel architecture for read-only context exploration.

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

Version `0.3.0` contains the first real explorer slice plus focused panel I/O, native custom-panel auth bridge fixes, privacy-first display refinement, and the first logic/reference starter slice:

- overview
- entities
- devices
- areas
- integrations
- relationships
- logic

The logic slice currently reads only canonical `automations.yaml` and `scripts.yaml` for best-effort automation/script/entity references. It exposes source coverage directly so users can see parsed, missing, unsupported, failed, and partial states.

Future scope may include floors, labels, dashboards, services, package/include logic layouts, full template dependency coverage, graph visualization, and deeper execution/context modeling, but those remain planned and unavailable in this phase.
