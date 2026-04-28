## Summary

Add brand icons for the HA Context Explorer custom integration.

## Details

- Integration domain: `ha_context_explorer`
- Target folder: `custom_integrations/ha_context_explorer/`
- Files:
  - `icon.png` - 256x256 PNG
  - `icon@2x.png` - 512x512 PNG

The domain matches the manifest domain used by the custom integration.

The images are PNG, square, and derived from the project's own provisional HA Context Explorer logo. They do not use Home Assistant-owned brand marks.

No `logo.png` is included because the current source asset is square; icon fallback is acceptable unless maintainers request a separate logo variant.

After merge and cache expiry, validate:

`https://brands.home-assistant.io/_/ha_context_explorer/icon.png`
