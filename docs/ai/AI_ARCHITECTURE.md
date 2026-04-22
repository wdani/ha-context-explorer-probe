# AI Architecture

## Runtime shape

The integration registers:

- a Home Assistant native custom sidebar panel
- static frontend assets under `/local/ha_context_explorer_probe`
- seven authenticated admin-only JSON endpoints under `/api/ha_context_explorer_probe`

The panel frontend is a JavaScript module custom element registered through `panel_custom`. Home Assistant passes the frontend `hass` object to the element. Real data access is enforced at the JSON endpoints.

## Backend data flow

The backend reads only Home Assistant in-memory data:

- `hass.states.async_all()`
- entity registry
- device registry
- area registry
- config entries
- loaded component names
- canonical `automations.yaml`
- canonical `scripts.yaml`

It shapes those sources into compact JSON contracts for overview, entities, devices, areas, integrations, relationships, and logic. It does not expose raw registry objects.

The logic scope is intentionally narrow. It reads only canonical automation and script YAML files, returns structured `source_coverage`, and does not read `.storage`, secrets, packages, include trees, dashboards, or broad config directories.

## Privacy layer

The privacy layer masks obvious sensitive string patterns before values are returned to the frontend. It currently covers:

- IPv4-like values
- MAC-like values
- Wi-Fi / SSID / BSSID contexts

Masking is best-effort and not guaranteed anonymization.

## Frontend data flow

The frontend calls each scope endpoint through `hass.callApi("GET", "ha_context_explorer_probe/<scope>")`. It does not hard-code browser storage token keys. If Home Assistant auth is unavailable to the custom panel runtime, the frontend records one global 401/403 protected-data failure and stops further endpoint requests for that page session.

The Logic tab renders source coverage before logic rows so users can distinguish parsed, missing, unsupported, failed, and partially parsed sources without reading docs first.

## Capability model

Implemented scopes are exposed explicitly. Future scopes are reported as unavailable/not implemented rather than faked.
