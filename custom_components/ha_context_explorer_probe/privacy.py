"""Privacy helpers for HA Context Explorer."""
from __future__ import annotations

import re
from typing import Any

IPV4_RE = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}"
    r"(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\b"
)
MAC_RE = re.compile(r"\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b")
WIFI_KEY_RE = re.compile(r"(?:^|[_\s-])(ssid|bssid|wifi|wi[-_\s]?fi|wireless)(?:$|[_\s-])", re.I)
WIFI_VALUE_RE = re.compile(r"\b(ssid|bssid|wi[-_\s]?fi|wireless)\b\s*[:=]", re.I)

MASK_METADATA = {
    "[masked-ipv4]": {
        "reason": "ipv4_like_value",
        "description": "IPv4-like string value masked before display or export.",
    },
    "[masked-mac]": {
        "reason": "mac_like_value",
        "description": "MAC-like string value masked before display or export.",
    },
    "[masked-wifi]": {
        "reason": "wifi_context",
        "description": "Wi-Fi, SSID, BSSID, or wireless-context value masked before display or export.",
    },
}


def mask_value(value: Any, key: str | None = None) -> Any:
    """Mask obvious sensitive values while preserving non-string measurements."""
    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        return mask_string(value, key)

    if isinstance(value, (list, tuple)):
        return [mask_value(item, key) for item in value]

    if isinstance(value, dict):
        return {str(item_key): mask_value(item_value, str(item_key)) for item_key, item_value in value.items()}

    return str(value)


def mask_string(value: str, key: str | None = None) -> str:
    """Mask obvious sensitive string patterns.

    This is intentionally conservative and best-effort. It avoids treating normal
    numeric measurements as sensitive while masking IP, MAC, and Wi-Fi context.
    """
    if not value:
        return value

    key_text = key or ""
    if WIFI_KEY_RE.search(f" {key_text} ") or WIFI_VALUE_RE.search(value):
        return "[masked-wifi]"

    masked = IPV4_RE.sub("[masked-ipv4]", value)
    return MAC_RE.sub("[masked-mac]", masked)
