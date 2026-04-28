# Home Assistant Brands PR helper

This folder prepares the external Home Assistant Brands submission assets for HA Context Explorer.

Target external repository:

- `home-assistant/brands`

Target external folder:

- `custom_integrations/ha_context_explorer/`

Prepared files:

- `custom_integrations/ha_context_explorer/icon.png` - 256x256 PNG
- `custom_integrations/ha_context_explorer/icon@2x.png` - 512x512 PNG

Notes:

- These files are derived from the provisional HA Context Explorer project logo.
- They do not use Home Assistant-owned brand marks.
- No `logo.png` is prepared yet because the current source asset is square; the Brands PR can rely on icon fallback unless a proper logo variant is created later.
- Final display in HACS/Home Assistant depends on external review and merge in `home-assistant/brands`, plus CDN/browser cache expiry.
- After merge and cache expiry, validate `https://brands.home-assistant.io/_/ha_context_explorer/icon.png`.
