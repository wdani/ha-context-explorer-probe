"""HA Context Explorer Probe integration."""
from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend
from homeassistant.components.http import HomeAssistantView
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from aiohttp import web

from .api import register_api_views
from .const import DOMAIN, NAME, PANEL_URL, STATIC_URL, VERSION


class ProbePanelView(HomeAssistantView):
    """Serve the panel HTML."""

    url = PANEL_URL
    name = f"{DOMAIN}:panel"
    requires_auth = False

    def __init__(self, html: str) -> None:
        self._html = html

    async def get(self, request: web.Request) -> web.Response:
        return web.Response(text=self._html, content_type="text/html")


def _load_panel_html(html_path: str, version: str) -> str:
    """Load and prepare panel HTML outside the event loop."""
    return Path(html_path).read_text(encoding="utf-8").replace("{{VERSION}}", version)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the integration base."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up the integration from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {}

    html_path = hass.config.path("custom_components", DOMAIN, "www", "panel.html")
    panel_html = await hass.async_add_executor_job(_load_panel_html, html_path, VERSION)
    hass.http.register_view(ProbePanelView(panel_html))
    register_api_views(hass)

    static_path = str(hass.config.path("custom_components", DOMAIN, "www"))
    if hasattr(hass.http, "async_register_static_paths"):
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths(
            [StaticPathConfig(url_path=STATIC_URL, path=static_path, cache_headers=False)]
        )
    else:
        hass.http.register_static_path(STATIC_URL, static_path, False)

    frontend.async_register_built_in_panel(
        hass,
        component_name="iframe",
        sidebar_title=NAME,
        sidebar_icon="mdi:database-search",
        frontend_url_path=DOMAIN,
        config={"url": PANEL_URL},
        require_admin=True,
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the integration."""
    frontend.async_remove_panel(hass, DOMAIN)
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
