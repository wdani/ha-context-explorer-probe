"""Developer Workbench metadata for HA Context Explorer."""
from __future__ import annotations

from typing import Any

from .const import DOMAIN, VERSION
from .privacy import MASK_METADATA

WORKBENCH_STORAGE_KEY = f"{DOMAIN}.developer_workbench.enabled"
WORKBENCH_EXPORT_SCHEMA = "developer_workbench_bundle/v1"


def build_workbench_payload() -> dict[str, Any]:
    """Build safe admin-only metadata for the Developer Workbench."""
    return {
        "version": VERSION,
        "scope": "workbench",
        "product_name": "HA Context Explorer",
        "availability": {
            "developer_workbench": True,
            "admin_only": True,
            "core_explorer_unchanged": True,
            "dev_actions_plane": True,
            "write_actions_enabled": False,
        },
        "persistence": {
            "mode": "browser_local_enable_flag",
            "storage_key": WORKBENCH_STORAGE_KEY,
            "persists_payloads": False,
            "persists_runtime_logs": False,
            "rationale": "Browser-local enablement keeps the normal read-only trust model without adding a Home Assistant settings writer.",
        },
        "exports": {
            "schema": WORKBENCH_EXPORT_SCHEMA,
            "local_only": True,
            "provenance_values": [
                "current_live_rendered_state",
                "best_effort_active_view_snapshot",
            ],
            "not_a_screenshot": True,
            "not_a_complete_system_capture": True,
        },
        "privacy": {
            "mode": "mask_first",
            "guarantee": "best_effort_not_anonymization",
            "mask_tokens": MASK_METADATA,
        },
        "runtime_log": {
            "bounded": True,
            "max_events": 80,
            "stores_full_payloads": False,
            "stores_unmasked_values": False,
        },
        "dev_actions": {
            "registered_actions": [],
            "write_actions_enabled": False,
            "dry_run_default": True,
            "arming_required": True,
            "typed_confirmation_reserved": True,
            "audit_trail_reserved": True,
            "status": "reserved_extension_point",
        },
        "warnings": [
            "Developer Workbench exports are local review artifacts, not screenshots or complete Home Assistant captures.",
            "Developer Workbench does not enable write actions in this foundation release.",
        ],
    }
