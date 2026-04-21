# AI Architecture

## Runtime shape

The integration registers:

- a Home Assistant iframe sidebar panel
- static frontend assets under `/local/ha_context_explorer_probe`
- six authenticated admin-only JSON endpoints under `/api/ha_context_explorer_probe`

The panel shell may remain boot-compatible for iframe loading. Its HTML is loaded during setup and then served from memory. Real data access is enforced at the JSON endpoints.

## Backend data flow

The backend reads only Home Assistant in-memory data:

- `hass.states.async_all()`
- entity registry
- device registry
- area registry
- config entries
- loaded component names

It shapes those sources into compact JSON contracts for overview, entities, devices, areas, integrations, and relationships. It does not expose raw registry objects.

## Privacy layer

The privacy layer masks obvious sensitive string patterns before values are returned to the frontend. It currently covers:

- IPv4-like values
- MAC-like values
- Wi-Fi / SSID / BSSID contexts

Masking is best-effort and not guaranteed anonymization.

## Frontend data flow

The frontend uses same-origin `fetch` with credentials for each scope endpoint. It does not hard-code browser storage token keys. If Home Assistant auth is unavailable to the iframe runtime, the frontend records one global 401/403 protected-data failure and stops further endpoint requests for that page session.

## Capability model

Implemented scopes are exposed explicitly. Future scopes are reported as unavailable/not implemented rather than faked.
