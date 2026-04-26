"""HA Context Explorer integration."""
from __future__ import annotations

from homeassistant.components import frontend, panel_custom
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .api import register_api_views
from .const import DOMAIN, NAME, PANEL_ELEMENT, STATIC_URL, VERSION


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the integration base."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the integration from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    register_api_views(hass)

    static_path = str(hass.config.path("custom_components", DOMAIN, "www"))
    if hasattr(hass.http, "async_register_static_paths"):
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=STATIC_URL, path=static_path, cache_headers=False)]
        )
    else:
        hass.http.register_static_path(STATIC_URL, static_path, False)

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=DOMAIN,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=NAME,
        sidebar_icon="mdi:database-search",
        module_url=f"{STATIC_URL}/app.js?v={VERSION}",
        embed_iframe=False,
        require_admin=True,
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the integration."""
    frontend.async_remove_panel(hass, DOMAIN)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
