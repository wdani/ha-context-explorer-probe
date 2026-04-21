# AGENTS.md

This repository is a separate experimental project.
It is not a continuation of ha-ai-context-exporter.

Core rules:
- strict read-only
- GET endpoints only
- no POST / PUT / PATCH / DELETE
- no service calls
- no state changes
- no file writes to Home Assistant config
- no secret access
- no writes to .storage
- privacy-first defaults
- admin-only access for real data surfaces

Project direction:
- native Home Assistant custom integration
- custom sidebar panel UI
- capability-based architecture
- honest unavailable/not-implemented handling
- future scopes may include floors, labels, dashboards, services, and logic