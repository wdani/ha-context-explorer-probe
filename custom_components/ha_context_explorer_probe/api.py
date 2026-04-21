"""Read-only HTTP API for HA Context Explorer Probe."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import Unauthorized
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, VERSION
from .privacy import mask_value

API_BASE = f"/api/{DOMAIN}"

IMPLEMENTED_SCOPES = (
    "overview",
    "entities",
    "devices",
    "areas",
    "integrations",
    "relationships",
)

FUTURE_SCOPES = (
    "floors",
    "labels",
    "dashboards",
    "services",
    "logic",
)

IMPORTANT_ATTRIBUTE_KEYS = (
    "device_class",
    "state_class",
    "unit_of_measurement",
    "supported_features",
    "assumed_state",
    "battery_level",
    "current_position",
    "current_temperature",
    "temperature",
    "humidity",
    "illuminance",
)

READ_ONLY_FLAGS = {
    "read_only": True,
    "get_only": True,
    "writes_enabled": False,
    "service_calls_enabled": False,
    "state_changes_enabled": False,
    "config_writes_enabled": False,
    "secret_access_enabled": False,
}


@dataclass(frozen=True)
class ProbeSnapshot:
    """In-memory Home Assistant data used to shape one response."""

    states: list[Any]
    entity_entries_by_id: dict[str, Any]
    device_entries_by_id: dict[str, Any]
    area_entries_by_id: dict[str, Any]
    config_entries_by_id: dict[str, Any]
    config_entries: list[Any]
    components: set[str]
    warnings: list[str]


class ProbeDataView(HomeAssistantView):
    """Authenticated admin-only GET endpoint for one probe scope."""

    requires_auth = True

    def __init__(self, scope: str, builder: Callable[[HomeAssistant], dict[str, Any]]) -> None:
        self.url = f"{API_BASE}/{scope}"
        self.name = f"api:{DOMAIN}:{scope}"
        self._builder = builder

    async def get(self, request: web.Request) -> web.Response:
        """Return compact read-only data for one scope."""
        _require_admin(request)
        hass: HomeAssistant = request.app["hass"]
        return self.json(self._builder(hass))


def register_api_views(hass: HomeAssistant) -> None:
    """Register all real data API views."""
    views: tuple[tuple[str, Callable[[HomeAssistant], dict[str, Any]]], ...] = (
        ("overview", build_overview_payload),
        ("entities", build_entities_payload),
        ("devices", build_devices_payload),
        ("areas", build_areas_payload),
        ("integrations", build_integrations_payload),
        ("relationships", build_relationships_payload),
    )
    for scope, builder in views:
        hass.http.register_view(ProbeDataView(scope, builder))


def build_overview_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build the overview response."""
    snapshot = _snapshot(hass)
    entity_items = _build_entity_items(snapshot)
    device_items = _build_device_items(snapshot)
    area_items = _build_area_items(snapshot)
    integration_items = _build_integration_items(snapshot)
    relationships = _build_relationships(snapshot)

    warnings = list(snapshot.warnings)
    warnings.extend(
        [
            "Real data endpoints require authenticated Home Assistant admin access.",
            "Privacy masking is best-effort and is not guaranteed anonymization.",
            "The native panel may load while JSON data remains unavailable if the frontend auth context cannot reach the API.",
        ]
    )

    return {
        "version": VERSION,
        "domain": DOMAIN,
        "mode": "read_only_probe",
        "flags": READ_ONLY_FLAGS,
        "counts": {
            "entities": len(entity_items),
            "devices": len(device_items),
            "areas": len(area_items),
            "integrations": len(integration_items),
            "relationships": relationships["counts"],
        },
        "capabilities": {
            "implemented": {
                scope: {
                    "available": True,
                    "endpoint": f"{API_BASE}/{scope}",
                }
                for scope in IMPLEMENTED_SCOPES
            },
            "future": [
                {
                    "scope": scope,
                    "available": False,
                    "status": "not_implemented",
                }
                for scope in FUTURE_SCOPES
            ],
        },
        "privacy": {
            "mode": "mask_first",
            "persistent_preferences": False,
            "masking": ["ipv4", "mac", "wifi_context"],
            "guarantee": "best_effort_not_anonymization",
        },
        "warnings": warnings,
    }


def build_entities_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build compact entity data."""
    snapshot = _snapshot(hass)
    items = _build_entity_items(snapshot)
    return {
        "version": VERSION,
        "scope": "entities",
        "count": len(items),
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        "items": items,
        "warnings": snapshot.warnings,
    }


def build_devices_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build compact device data."""
    snapshot = _snapshot(hass)
    items = _build_device_items(snapshot)
    return {
        "version": VERSION,
        "scope": "devices",
        "count": len(items),
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        "items": items,
        "warnings": snapshot.warnings,
    }


def build_areas_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build compact area data."""
    snapshot = _snapshot(hass)
    items = _build_area_items(snapshot)
    return {
        "version": VERSION,
        "scope": "areas",
        "count": len(items),
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        "items": items,
        "warnings": snapshot.warnings,
    }


def build_integrations_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build compact integration data."""
    snapshot = _snapshot(hass)
    items = _build_integration_items(snapshot)
    return {
        "version": VERSION,
        "scope": "integrations",
        "count": len(items),
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        "items": items,
        "warnings": snapshot.warnings,
    }


def build_relationships_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build first structured relationship sets."""
    snapshot = _snapshot(hass)
    relationships = _build_relationships(snapshot)
    return {
        "version": VERSION,
        "scope": "relationships",
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        **relationships,
        "warnings": snapshot.warnings,
    }


def _require_admin(request: web.Request) -> None:
    """Require an authenticated Home Assistant admin user."""
    user = request.get("hass_user")
    if user is None or not getattr(user, "is_admin", False):
        raise Unauthorized()


def _snapshot(hass: HomeAssistant) -> ProbeSnapshot:
    """Read Home Assistant in-memory state and registries."""
    warnings: list[str] = []

    entity_registry = _safe_registry(er.async_get, hass, "entity", warnings)
    device_registry = _safe_registry(dr.async_get, hass, "device", warnings)
    area_registry = _safe_registry(ar.async_get, hass, "area", warnings)

    try:
        states = list(hass.states.async_all())
    except Exception as err:  # pragma: no cover - defensive for runtime variation
        states = []
        warnings.append(f"State machine unavailable: {type(err).__name__}")

    try:
        config_entries = list(hass.config_entries.async_entries())
    except Exception as err:  # pragma: no cover - defensive for runtime variation
        config_entries = []
        warnings.append(f"Config entries unavailable: {type(err).__name__}")

    components = {
        _component_domain(component)
        for component in getattr(hass.config, "components", set())
        if isinstance(component, str)
    }

    entity_entries = _registry_items(entity_registry, "entities")
    device_entries = _registry_items(device_registry, "devices")
    area_entries = _registry_items(area_registry, "areas")

    return ProbeSnapshot(
        states=states,
        entity_entries_by_id={
            entity_id: entry
            for entry in entity_entries
            if (entity_id := _entry_attr(entry, "entity_id")) is not None
        },
        device_entries_by_id={
            device_id: entry
            for entry in device_entries
            if (device_id := _entry_attr(entry, "id")) is not None
        },
        area_entries_by_id={
            area_id: entry
            for entry in area_entries
            if (area_id := _entry_attr(entry, "id")) is not None
        },
        config_entries_by_id={
            entry_id: entry
            for entry in config_entries
            if (entry_id := _entry_attr(entry, "entry_id")) is not None
        },
        config_entries=config_entries,
        components=components,
        warnings=warnings,
    )


def _build_entity_items(snapshot: ProbeSnapshot) -> list[dict[str, Any]]:
    """Shape state machine entities with registry hints."""
    items: list[dict[str, Any]] = []

    for state in sorted(snapshot.states, key=lambda item: item.entity_id):
        entity_id = state.entity_id
        entry = snapshot.entity_entries_by_id.get(entity_id)
        device_id = _entry_attr(entry, "device_id")
        direct_area_id = _entry_attr(entry, "area_id")
        resolved_area_id = _resolve_area_id(snapshot, entry)
        integration = _entity_integration(snapshot, entity_id, entry)
        friendly_name = state.attributes.get("friendly_name") if hasattr(state, "attributes") else None

        items.append(
            {
                "entity_id": entity_id,
                "domain": _entity_domain(entity_id),
                "state": mask_value(state.state, "state"),
                "friendly_name": mask_value(friendly_name, "friendly_name") if friendly_name else None,
                "last_changed": _isoformat(getattr(state, "last_changed", None)),
                "last_updated": _isoformat(getattr(state, "last_updated", None)),
                "important_attributes": _important_attributes(getattr(state, "attributes", {})),
                "device_id": device_id,
                "area_id": direct_area_id,
                "resolved_area_id": resolved_area_id,
                "integration": integration,
            }
        )

    return items


def _build_device_items(snapshot: ProbeSnapshot) -> list[dict[str, Any]]:
    """Shape device registry entries."""
    entity_counts = _device_entity_counts(snapshot)
    items: list[dict[str, Any]] = []

    for device_id, device in sorted(snapshot.device_entries_by_id.items()):
        integrations = _device_integrations(snapshot, device)
        items.append(
            {
                "device_id": device_id,
                "name": mask_value(_device_name(device), "device_name"),
                "manufacturer": mask_value(_entry_attr(device, "manufacturer"), "manufacturer"),
                "model": mask_value(_entry_attr(device, "model"), "model"),
                "area_id": _entry_attr(device, "area_id"),
                "linked_entity_count": entity_counts.get(device_id, 0),
                "integrations": integrations,
            }
        )

    return items


def _build_area_items(snapshot: ProbeSnapshot) -> list[dict[str, Any]]:
    """Shape area registry entries with resolved counts."""
    device_counts = _area_device_counts(snapshot)
    entity_counts = _area_entity_counts(snapshot)
    items: list[dict[str, Any]] = []

    for area_id, area in sorted(snapshot.area_entries_by_id.items(), key=lambda item: _entry_attr(item[1], "name") or ""):
        items.append(
            {
                "area_id": area_id,
                "name": mask_value(_entry_attr(area, "name"), "area_name"),
                "device_count": device_counts.get(area_id, 0),
                "entity_count": entity_counts.get(area_id, 0),
            }
        )

    return items


def _build_integration_items(snapshot: ProbeSnapshot) -> list[dict[str, Any]]:
    """Shape config-entry and component-oriented integration data."""
    domains = set(snapshot.components)
    domains.update(_entry_attr(entry, "domain") for entry in snapshot.config_entries if _entry_attr(entry, "domain"))
    domains.update(
        integration
        for entity_id, entry in snapshot.entity_entries_by_id.items()
        if (integration := _entity_integration(snapshot, entity_id, entry))
    )

    entity_counts = _integration_entity_counts(snapshot)
    device_counts = _integration_device_counts(snapshot)

    items: list[dict[str, Any]] = []
    for domain in sorted(domains):
        entries = [_entry for _entry in snapshot.config_entries if _entry_attr(_entry, "domain") == domain]
        first_title = next((_entry_attr(entry, "title") for entry in entries if _entry_attr(entry, "title")), domain)
        sources = sorted(
            source
            for entry in entries
            if (source := _string_value(_entry_attr(entry, "source")))
        )
        has_component = domain in snapshot.components
        has_entries = bool(entries)

        items.append(
            {
                "domain": domain,
                "title": mask_value(first_title, "integration_title"),
                "source": sources[0] if len(sources) == 1 else ("multiple" if sources else None),
                "kind": _integration_kind(has_entries, has_component),
                "entry_count": len(entries),
                "entity_count": entity_counts.get(domain, 0),
                "device_count": device_counts.get(domain, 0),
                "available": has_entries or has_component,
                "loaded_component": has_component,
            }
        )

    return items


def _build_relationships(snapshot: ProbeSnapshot) -> dict[str, Any]:
    """Build structured relationship links."""
    entity_to_device = []
    entity_to_area = []
    entity_to_integration = []
    device_to_area = []
    device_to_integration = []

    for entity_id, entry in sorted(snapshot.entity_entries_by_id.items()):
        device_id = _entry_attr(entry, "device_id")
        direct_area_id = _entry_attr(entry, "area_id")
        resolved_area_id = _resolve_area_id(snapshot, entry)
        integration = _entity_integration(snapshot, entity_id, entry)

        if device_id:
            entity_to_device.append({"entity_id": entity_id, "device_id": device_id})
        if resolved_area_id:
            source = "entity" if direct_area_id else "device"
            entity_to_area.append({"entity_id": entity_id, "area_id": resolved_area_id, "source": source})
        if integration:
            entity_to_integration.append({"entity_id": entity_id, "domain": integration})

    for device_id, device in sorted(snapshot.device_entries_by_id.items()):
        area_id = _entry_attr(device, "area_id")
        if area_id:
            device_to_area.append({"device_id": device_id, "area_id": area_id})
        for integration in _device_integrations(snapshot, device):
            device_to_integration.append({"device_id": device_id, "domain": integration})

    return {
        "counts": {
            "entity_to_device": len(entity_to_device),
            "entity_to_area": len(entity_to_area),
            "entity_to_integration": len(entity_to_integration),
            "device_to_area": len(device_to_area),
            "device_to_integration": len(device_to_integration),
        },
        "entity_to_device": entity_to_device,
        "entity_to_area": entity_to_area,
        "entity_to_integration": entity_to_integration,
        "device_to_area": device_to_area,
        "device_to_integration": device_to_integration,
    }


def _safe_registry(
    getter: Callable[[HomeAssistant], Any],
    hass: HomeAssistant,
    name: str,
    warnings: list[str],
) -> Any | None:
    """Return a registry or append a warning if a runtime varies unexpectedly."""
    try:
        return getter(hass)
    except Exception as err:  # pragma: no cover - defensive for runtime variation
        warnings.append(f"{name.title()} registry unavailable: {type(err).__name__}")
        return None


def _registry_items(registry: Any | None, collection_name: str) -> list[Any]:
    """Return registry collection values across HA registry implementations."""
    if registry is None:
        return []

    collection = getattr(registry, collection_name, {})
    if hasattr(collection, "values"):
        return list(collection.values())
    return list(collection)


def _entry_attr(entry: Any | None, attr: str, default: Any = None) -> Any:
    """Read an object or mapping attribute without exposing raw entries."""
    if entry is None:
        return default
    if isinstance(entry, dict):
        return entry.get(attr, default)
    return getattr(entry, attr, default)


def _string_value(value: Any | None) -> str | None:
    """Return a JSON-safe compact string for enum-like values."""
    if value is None:
        return None
    if enum_value := getattr(value, "value", None):
        return str(enum_value)
    return str(value)


def _entity_domain(entity_id: str) -> str:
    """Return the entity domain."""
    return entity_id.split(".", 1)[0] if "." in entity_id else entity_id


def _component_domain(component: str) -> str:
    """Return the top-level component domain."""
    return component.split(".", 1)[0]


def _isoformat(value: Any) -> str | None:
    """Return an ISO timestamp string when possible."""
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def _important_attributes(attributes: dict[str, Any]) -> dict[str, Any]:
    """Return a small whitelisted attribute subset."""
    result: dict[str, Any] = {}
    for key in IMPORTANT_ATTRIBUTE_KEYS:
        if key not in attributes:
            continue
        value = attributes[key]
        if _is_small_json_value(value):
            result[key] = mask_value(value, key)
    return result


def _is_small_json_value(value: Any) -> bool:
    """Keep selected attributes scalar or very small lists."""
    if value is None or isinstance(value, (str, bool, int, float)):
        return True
    if isinstance(value, (list, tuple)):
        return len(value) <= 5 and all(item is None or isinstance(item, (str, bool, int, float)) for item in value)
    return False


def _device_name(device: Any) -> str | None:
    """Return the most user-facing device name."""
    return _entry_attr(device, "name_by_user") or _entry_attr(device, "name")


def _config_entry_domain(snapshot: ProbeSnapshot, entry_id: str | None) -> str | None:
    """Resolve a config entry domain."""
    if not entry_id:
        return None
    return _entry_attr(snapshot.config_entries_by_id.get(entry_id), "domain")


def _entity_integration(snapshot: ProbeSnapshot, entity_id: str, entry: Any | None) -> str | None:
    """Resolve the best integration hint for an entity."""
    return (
        _config_entry_domain(snapshot, _entry_attr(entry, "config_entry_id"))
        or _entry_attr(entry, "platform")
        or _entity_domain(entity_id)
    )


def _device_integrations(snapshot: ProbeSnapshot, device: Any) -> list[str]:
    """Resolve integration domains linked to a device."""
    config_entry_ids = _entry_attr(device, "config_entries") or []
    domains = {
        domain
        for config_entry_id in config_entry_ids
        if (domain := _config_entry_domain(snapshot, config_entry_id))
    }
    primary = _config_entry_domain(snapshot, _entry_attr(device, "primary_config_entry"))
    if primary:
        domains.add(primary)
    return sorted(domains)


def _resolve_area_id(snapshot: ProbeSnapshot, entity_entry: Any | None) -> str | None:
    """Resolve entity area directly or via linked device."""
    direct_area_id = _entry_attr(entity_entry, "area_id")
    if direct_area_id:
        return direct_area_id

    device_id = _entry_attr(entity_entry, "device_id")
    if not device_id:
        return None
    return _entry_attr(snapshot.device_entries_by_id.get(device_id), "area_id")


def _device_entity_counts(snapshot: ProbeSnapshot) -> dict[str, int]:
    """Count registry entities per device."""
    counts: dict[str, int] = {}
    for entry in snapshot.entity_entries_by_id.values():
        if device_id := _entry_attr(entry, "device_id"):
            counts[device_id] = counts.get(device_id, 0) + 1
    return counts


def _area_device_counts(snapshot: ProbeSnapshot) -> dict[str, int]:
    """Count devices per area."""
    counts: dict[str, int] = {}
    for device in snapshot.device_entries_by_id.values():
        if area_id := _entry_attr(device, "area_id"):
            counts[area_id] = counts.get(area_id, 0) + 1
    return counts


def _area_entity_counts(snapshot: ProbeSnapshot) -> dict[str, int]:
    """Count entities per resolved area."""
    counts: dict[str, int] = {}
    for entry in snapshot.entity_entries_by_id.values():
        if area_id := _resolve_area_id(snapshot, entry):
            counts[area_id] = counts.get(area_id, 0) + 1
    return counts


def _integration_entity_counts(snapshot: ProbeSnapshot) -> dict[str, int]:
    """Count entities per integration hint."""
    counts: dict[str, int] = {}
    for entity_id, entry in snapshot.entity_entries_by_id.items():
        if domain := _entity_integration(snapshot, entity_id, entry):
            counts[domain] = counts.get(domain, 0) + 1
    return counts


def _integration_device_counts(snapshot: ProbeSnapshot) -> dict[str, int]:
    """Count devices per integration domain."""
    counts: dict[str, int] = {}
    for device in snapshot.device_entries_by_id.values():
        for domain in _device_integrations(snapshot, device):
            counts[domain] = counts.get(domain, 0) + 1
    return counts


def _integration_kind(has_entries: bool, has_component: bool) -> str:
    """Describe the source shape for one integration item."""
    if has_entries and has_component:
        return "config_entry_and_component"
    if has_entries:
        return "config_entry"
    return "component"
