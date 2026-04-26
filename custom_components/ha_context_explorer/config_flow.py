"""Config flow for HA Context Explorer."""
from __future__ import annotations

from homeassistant import config_entries

from .const import DOMAIN


class HAContextExplorerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Minimal config flow."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        return self.async_create_entry(title="HA Context Explorer", data={})
