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

Version `0.2.1` contains the first real explorer slice plus a focused panel I/O and auth-failure handling fix:

- overview
- entities
- devices
- areas
- integrations
- relationships

Future scopes may include floors, labels, dashboards, services, and logic, but those remain planned and unavailable in this phase.
