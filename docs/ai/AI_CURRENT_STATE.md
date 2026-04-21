# AI Current State

## Version

`0.2.2`

## Implemented

- Native Home Assistant custom integration scaffold
- Single-instance config flow
- Native custom sidebar panel
- Static frontend bundle
- GET-only real data endpoints for:
  - overview
  - entities
  - devices
  - areas
  - integrations
  - relationships
- Admin-only enforcement for JSON data endpoints
- Compact backend shaping layer
- Best-effort masking for selected sensitive string patterns
- Tabbed frontend views with entity search/domain filtering
- Frontend API loading through the Home Assistant `hass.callApi` panel context
- Global frontend protected-data failure state for 401/403 auth failures
- Documentation and review baseline

## Not implemented

- Floors full implementation
- Labels full implementation
- Dashboards full implementation
- Deep YAML or logic graphing
- Service exploration beyond future planning
- Write settings or saved preferences
- Any mutation feature

## Known validation gap

Local syntax and static checks are useful, but live Home Assistant runtime testing is still required to confirm whether the native custom panel auth context can access admin-only JSON endpoints in each deployment. If it cannot, the current UI fails once and explains the protected-data failure without weakening endpoint auth.
