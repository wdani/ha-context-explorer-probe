"""Read-only logic/reference shaping for HA Context Explorer."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .const import VERSION
from .privacy import mask_value

try:
    import yaml
except ImportError:  # pragma: no cover - Home Assistant normally provides PyYAML
    yaml = None


SOURCE_AUTOMATIONS = "automations_yaml"
SOURCE_SCRIPTS = "scripts_yaml"
SOURCE_FILE_AUTOMATIONS = "automations.yaml"
SOURCE_FILE_SCRIPTS = "scripts.yaml"

SOURCE_STATUS_PARSED = "parsed_available"
SOURCE_STATUS_MISSING = "missing"
SOURCE_STATUS_UNSUPPORTED = "unsupported_starter_slice"
SOURCE_STATUS_FAILED = "parse_failed"
SOURCE_STATUS_PARTIAL = "partially_parsed"

ENTITY_ID_RE = re.compile(r"\b[a-zA-Z_][\w]*\.[a-zA-Z0-9_]+\b")
SCRIPT_ENTITY_RE = re.compile(r"\bscript\.([a-zA-Z0-9_]+)\b")


@dataclass
class RuntimeContext:
    """Compact runtime lookup context for logic labels."""

    known_entity_ids: set[str]
    entity_labels: dict[str, str]
    automation_states_by_config_id: dict[str, Any]
    automation_states_by_alias: dict[str, Any]
    states_by_entity_id: dict[str, Any]


@dataclass
class LoadedSource:
    """Loaded canonical YAML source plus coverage metadata."""

    source: str
    label: str
    source_file: str
    root_kind: str
    status: str
    data: Any
    parsed_item_count: int = 0
    detail: str | None = None
    unsupported_tags: tuple[str, ...] = ()


class LogicSafeLoader(yaml.SafeLoader if yaml else object):  # type: ignore[misc]
    """Safe YAML loader that records but does not resolve custom tags."""

    def __init__(self, stream: str) -> None:
        super().__init__(stream)  # type: ignore[misc]
        self.unsupported_tags: set[str] = set()


def _unknown_yaml_tag(loader: LogicSafeLoader, tag_suffix: str, node: Any) -> str:
    """Record an unsupported tag without exposing or resolving its value."""
    tag = f"!{tag_suffix.lstrip('!')}" if tag_suffix else "!unknown"
    loader.unsupported_tags.add(tag)
    return "[unsupported-yaml-tag]"


if yaml:
    LogicSafeLoader.add_multi_constructor("!", _unknown_yaml_tag)


async def build_logic_payload(hass: HomeAssistant) -> dict[str, Any]:
    """Build the read-only logic/reference response."""
    runtime = _build_runtime_context(hass)
    sources = await asyncio.gather(
        hass.async_add_executor_job(
            _load_yaml_source,
            hass.config.path(SOURCE_FILE_AUTOMATIONS),
            SOURCE_AUTOMATIONS,
            "Automations YAML",
            SOURCE_FILE_AUTOMATIONS,
            "automation",
        ),
        hass.async_add_executor_job(
            _load_yaml_source,
            hass.config.path(SOURCE_FILE_SCRIPTS),
            SOURCE_SCRIPTS,
            "Scripts YAML",
            SOURCE_FILE_SCRIPTS,
            "script",
        ),
    )

    automations_source, scripts_source = sources
    automations, automation_issues = _build_automation_items(automations_source, runtime)
    scripts, script_issues = _build_script_items(scripts_source, runtime)

    _finish_source_coverage(automations_source, automations, automation_issues)
    _finish_source_coverage(scripts_source, scripts, script_issues)

    entity_references = _build_entity_references(automations, scripts, runtime)
    source_coverage = [_source_coverage(source) for source in sources]
    source_coverage.extend(_unsupported_source_coverage())

    return {
        "version": VERSION,
        "scope": "logic",
        "privacy": {"mode": "mask_first", "guarantee": "best_effort_not_anonymization"},
        "counts": {
            "automations": len(automations),
            "scripts": len(scripts),
            "referenced_entities": len(entity_references),
            "automation_references": sum(len(item["referenced_entities"]) for item in automations),
            "script_references": sum(len(item["referenced_entities"]) for item in scripts),
            "script_to_script_references": sum(len(item["referenced_script_ids"]) for item in automations + scripts),
            "total_references": sum(len(item["referenced_entities"]) for item in automations + scripts),
        },
        "source_coverage": source_coverage,
        "automations": automations,
        "scripts": scripts,
        "entity_references": entity_references,
        "warnings": [
            "Entity and script reference extraction is best-effort and may miss dynamic or complex template references.",
            "This starter reports static references only; it does not trace runtime execution paths.",
        ],
    }


def _build_runtime_context(hass: HomeAssistant) -> RuntimeContext:
    """Collect known entities and display labels from in-memory HA context."""
    states: list[Any] = []
    try:
        states = list(hass.states.async_all())
    except Exception:  # pragma: no cover - defensive for runtime variation
        states = []

    known_entity_ids: set[str] = set()
    entity_labels: dict[str, str] = {}
    automation_states_by_config_id: dict[str, Any] = {}
    automation_states_by_alias: dict[str, Any] = {}
    states_by_entity_id: dict[str, Any] = {}

    for state in states:
        entity_id = getattr(state, "entity_id", None)
        if not entity_id:
            continue
        states_by_entity_id[entity_id] = state
        known_entity_ids.add(entity_id)
        attributes = getattr(state, "attributes", {}) or {}
        label = _display_candidate(attributes.get("friendly_name"), "friendly_name", (entity_id,))
        entity_labels[entity_id] = label or _entity_fallback(entity_id)

        if entity_id.startswith("automation."):
            config_id = attributes.get("id")
            if config_id is not None:
                automation_states_by_config_id[str(config_id)] = state
            if label:
                automation_states_by_alias[label.strip().lower()] = state

    try:
        registry = er.async_get(hass)
    except Exception:  # pragma: no cover - defensive for runtime variation
        registry = None

    for entry in _registry_items(registry, "entities"):
        entity_id = _entry_attr(entry, "entity_id")
        if not entity_id:
            continue
        known_entity_ids.add(entity_id)
        if entity_id not in entity_labels:
            label = (
                _display_candidate(_entry_attr(entry, "name"), "entity_name", (entity_id,))
                or _display_candidate(_entry_attr(entry, "original_name"), "entity_original_name", (entity_id,))
                or _entity_fallback(entity_id)
            )
            entity_labels[entity_id] = label

    return RuntimeContext(
        known_entity_ids=known_entity_ids,
        entity_labels=entity_labels,
        automation_states_by_config_id=automation_states_by_config_id,
        automation_states_by_alias=automation_states_by_alias,
        states_by_entity_id=states_by_entity_id,
    )


def _load_yaml_source(
    path_text: str,
    source: str,
    label: str,
    source_file: str,
    root_kind: str,
) -> LoadedSource:
    """Load one canonical source from disk without exposing its absolute path."""
    if yaml is None:
        return LoadedSource(
            source=source,
            label=label,
            source_file=source_file,
            root_kind=root_kind,
            status=SOURCE_STATUS_FAILED,
            data=None,
            detail="YAML parser unavailable.",
        )

    path = Path(path_text)
    if not path.is_file():
        return LoadedSource(
            source=source,
            label=label,
            source_file=source_file,
            root_kind=root_kind,
            status=SOURCE_STATUS_MISSING,
            data=None,
            detail="Canonical source file was not found.",
        )

    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as err:
        return LoadedSource(
            source=source,
            label=label,
            source_file=source_file,
            root_kind=root_kind,
            status=SOURCE_STATUS_FAILED,
            data=None,
            detail=f"Could not read source file: {type(err).__name__}.",
        )

    try:
        loader = LogicSafeLoader(content)
        try:
            data = loader.get_single_data()
            unsupported_tags = tuple(sorted(loader.unsupported_tags))
        finally:
            loader.dispose()
    except yaml.YAMLError as err:
        return LoadedSource(
            source=source,
            label=label,
            source_file=source_file,
            root_kind=root_kind,
            status=SOURCE_STATUS_FAILED,
            data=None,
            detail=_yaml_error_detail(err),
        )

    return LoadedSource(
        source=source,
        label=label,
        source_file=source_file,
        root_kind=root_kind,
        status=SOURCE_STATUS_PARSED,
        data=data,
        unsupported_tags=unsupported_tags,
    )


def _build_automation_items(source: LoadedSource, runtime: RuntimeContext) -> tuple[list[dict[str, Any]], list[str]]:
    """Build compact automation items from canonical YAML."""
    items: list[dict[str, Any]] = []
    issues: list[str] = []

    for index, config, item_id in _iter_source_items(source, issues):
        try:
            automation_id = _string_value(config.get("id")) or item_id or f"automation_{index + 1}"
            alias = _string_value(config.get("alias"))
            runtime_state = _automation_runtime_state(runtime, automation_id, alias)
            entity_id = getattr(runtime_state, "entity_id", None)
            display_name = _logic_display_name(alias, entity_id, runtime, f"Automation ({_identifier_suffix(automation_id)})")
            referenced_entities = sorted(_collect_entity_refs(config, runtime.known_entity_ids))
            referenced_script_ids = sorted(_collect_script_ids(config))
            items.append(
                {
                    "id": automation_id,
                    "entity_id": entity_id,
                    "display_name": display_name,
                    "alias": mask_value(alias, "automation_alias") if alias else None,
                    "source_kind": source.source,
                    "source_file": source.source_file,
                    "enabled": _automation_enabled(runtime_state),
                    "mode": _string_value(config.get("mode")),
                    "referenced_entities": referenced_entities,
                    "referenced_script_ids": referenced_script_ids,
                    "summary": {
                        "triggers": _count_items(config.get("triggers", config.get("trigger"))),
                        "conditions": _count_items(config.get("conditions", config.get("condition"))),
                        "actions": _count_items(config.get("actions", config.get("action"))),
                    },
                }
            )
        except Exception as err:  # pragma: no cover - defensive per-item isolation
            issues.append(f"Skipped one automation item: {type(err).__name__}.")

    return items, issues


def _build_script_items(source: LoadedSource, runtime: RuntimeContext) -> tuple[list[dict[str, Any]], list[str]]:
    """Build compact script items from canonical YAML."""
    items: list[dict[str, Any]] = []
    issues: list[str] = []

    for index, config, item_id in _iter_source_items(source, issues):
        try:
            script_id = item_id or _string_value(config.get("id")) or f"script_{index + 1}"
            entity_id = f"script.{script_id}"
            alias = _string_value(config.get("alias"))
            display_name = _logic_display_name(alias, entity_id, runtime, f"Script ({_identifier_suffix(script_id)})")
            referenced_entities = sorted(ref for ref in _collect_entity_refs(config, runtime.known_entity_ids) if ref != entity_id)
            referenced_script_ids = sorted(ref for ref in _collect_script_ids(config) if ref != script_id)
            items.append(
                {
                    "id": script_id,
                    "entity_id": entity_id,
                    "display_name": display_name,
                    "alias": mask_value(alias, "script_alias") if alias else None,
                    "source_kind": source.source,
                    "source_file": source.source_file,
                    "mode": _string_value(config.get("mode")),
                    "referenced_entities": referenced_entities,
                    "referenced_script_ids": referenced_script_ids,
                    "summary": {"actions": _count_items(config.get("sequence", config.get("actions", config.get("action"))))},
                }
            )
        except Exception as err:  # pragma: no cover - defensive per-item isolation
            issues.append(f"Skipped one script item: {type(err).__name__}.")

    return items, issues


def _iter_source_items(source: LoadedSource, issues: list[str]) -> list[tuple[int, dict[str, Any], str | None]]:
    """Return usable mapping items from a parsed source root."""
    if source.status in {SOURCE_STATUS_MISSING, SOURCE_STATUS_FAILED}:
        return []
    if source.data is None:
        return []

    items: list[tuple[int, dict[str, Any], str | None]] = []
    if source.root_kind == "automation":
        if isinstance(source.data, list):
            raw_items = [(index, item, None) for index, item in enumerate(source.data)]
        elif isinstance(source.data, dict):
            issues.append("Expected a list root but found a mapping root.")
            raw_items = [(index, item, str(key)) for index, (key, item) in enumerate(source.data.items())]
        else:
            issues.append(f"Expected a list root but found {type(source.data).__name__}.")
            return []
    else:
        if isinstance(source.data, dict):
            raw_items = [(index, item, str(key)) for index, (key, item) in enumerate(source.data.items())]
        elif isinstance(source.data, list):
            issues.append("Expected a mapping root but found a list root.")
            raw_items = [(index, item, None) for index, item in enumerate(source.data)]
        else:
            issues.append(f"Expected a mapping root but found {type(source.data).__name__}.")
            return []

    for index, item, item_id in raw_items:
        if isinstance(item, dict):
            items.append((index, item, item_id))
        else:
            issues.append(f"Skipped non-mapping item at index {index}.")
    return items


def _finish_source_coverage(source: LoadedSource, items: list[dict[str, Any]], issues: list[str]) -> None:
    """Finalize source coverage after item-level shaping."""
    source.parsed_item_count = len(items)
    if source.status in {SOURCE_STATUS_MISSING, SOURCE_STATUS_FAILED}:
        return

    details: list[str] = []
    if source.unsupported_tags:
        details.append(f"Unsupported YAML tags ignored: {', '.join(source.unsupported_tags)}.")
    if issues:
        details.extend(issues[:3])
        if len(issues) > 3:
            details.append(f"{len(issues) - 3} additional item issue(s) omitted.")

    if details:
        source.status = SOURCE_STATUS_PARTIAL if items else SOURCE_STATUS_FAILED
        source.detail = " ".join(details)
    elif source.detail is None:
        source.detail = f"Parsed {len(items)} item(s) from {source.source_file}."


def _source_coverage(source: LoadedSource) -> dict[str, Any]:
    """Return compact source coverage without absolute paths."""
    result = {
        "source": source.source,
        "label": source.label,
        "status": source.status,
        "parsed_item_count": source.parsed_item_count,
        "source_file": source.source_file,
    }
    if source.detail:
        result["detail"] = source.detail
    return result


def _unsupported_source_coverage() -> list[dict[str, Any]]:
    """Return explicit out-of-scope source records for the starter slice."""
    return [
        {
            "source": "packages",
            "label": "Packages",
            "status": SOURCE_STATUS_UNSUPPORTED,
            "parsed_item_count": 0,
            "detail": "Package-based configuration is not parsed in this starter slice.",
        },
        {
            "source": "include_based_layouts",
            "label": "Include-based layouts",
            "status": SOURCE_STATUS_UNSUPPORTED,
            "parsed_item_count": 0,
            "detail": "Include trees and split YAML layouts are not followed in this starter slice.",
        },
        {
            "source": "storage_editor_internals",
            "label": "Storage-only editor internals",
            "status": SOURCE_STATUS_UNSUPPORTED,
            "parsed_item_count": 0,
            "detail": "Home Assistant storage internals are intentionally not read.",
        },
        {
            "source": "dashboards",
            "label": "Dashboards",
            "status": SOURCE_STATUS_UNSUPPORTED,
            "parsed_item_count": 0,
            "detail": "Dashboard cards and views are out of scope for this starter slice.",
        },
        {
            "source": "full_template_dependency_coverage",
            "label": "Full template dependency coverage",
            "status": SOURCE_STATUS_UNSUPPORTED,
            "parsed_item_count": 0,
            "detail": "Template strings are scanned for obvious entity IDs, not fully analyzed.",
        },
    ]


def _build_entity_references(
    automations: list[dict[str, Any]],
    scripts: list[dict[str, Any]],
    runtime: RuntimeContext,
) -> list[dict[str, Any]]:
    """Build entity usage summaries from automation and script items."""
    usage: dict[str, dict[str, Any]] = {}

    for automation in automations:
        for entity_id in automation["referenced_entities"]:
            record = usage.setdefault(entity_id, {"automations": set(), "scripts": set()})
            record["automations"].add(automation["id"])

    for script in scripts:
        for entity_id in script["referenced_entities"]:
            record = usage.setdefault(entity_id, {"automations": set(), "scripts": set()})
            record["scripts"].add(script["id"])

    items = []
    for entity_id, record in usage.items():
        automation_refs = sorted(record["automations"])
        script_refs = sorted(record["scripts"])
        items.append(
            {
                "entity_id": entity_id,
                "display_name": runtime.entity_labels.get(entity_id, _entity_fallback(entity_id)),
                "reference_count": len(automation_refs) + len(script_refs),
                "referenced_by_automations": automation_refs,
                "referenced_by_scripts": script_refs,
            }
        )

    return sorted(items, key=lambda item: (-item["reference_count"], item["entity_id"]))


def _collect_entity_refs(value: Any, known_entity_ids: set[str], force: bool = False) -> set[str]:
    """Collect best-effort entity references from nested automation/script data."""
    refs: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            refs.update(_collect_entity_refs(item, known_entity_ids, force=_is_entity_key(str(key))))
    elif isinstance(value, (list, tuple, set)):
        for item in value:
            refs.update(_collect_entity_refs(item, known_entity_ids, force=force))
    elif isinstance(value, str):
        for candidate in ENTITY_ID_RE.findall(value):
            if force or candidate in known_entity_ids:
                refs.add(candidate)
    return refs


def _collect_script_ids(value: Any) -> set[str]:
    """Collect script IDs from nested automation/script data."""
    refs: set[str] = set()
    if isinstance(value, dict):
        for item in value.values():
            refs.update(_collect_script_ids(item))
    elif isinstance(value, (list, tuple, set)):
        for item in value:
            refs.update(_collect_script_ids(item))
    elif isinstance(value, str):
        refs.update(match.group(1) for match in SCRIPT_ENTITY_RE.finditer(value))
    return refs


def _is_entity_key(key: str) -> bool:
    """Return whether a key is intended to hold entity IDs."""
    return key in {"entity_id", "entity_ids", "entities"}


def _automation_runtime_state(runtime: RuntimeContext, automation_id: str, alias: str | None) -> Any | None:
    """Find an automation entity state when safely derivable."""
    if automation_id in runtime.automation_states_by_config_id:
        return runtime.automation_states_by_config_id[automation_id]
    if alias:
        return runtime.automation_states_by_alias.get(alias.strip().lower())
    return None


def _automation_enabled(state: Any | None) -> bool | None:
    """Return enabled state for automation entities when safely derivable."""
    if state is None:
        return None
    state_text = getattr(state, "state", None)
    if state_text == "on":
        return True
    if state_text == "off":
        return False
    return None


def _logic_display_name(alias: str | None, entity_id: str | None, runtime: RuntimeContext, fallback: str) -> str:
    """Return a masked user-facing label for a logic item."""
    if label := _display_candidate(alias, "logic_alias", (entity_id,)):
        return label
    if entity_id and entity_id in runtime.entity_labels:
        return runtime.entity_labels[entity_id]
    return fallback


def _count_items(value: Any) -> int:
    """Count top-level config items for a compact summary."""
    if value is None:
        return 0
    if isinstance(value, (list, tuple, set)):
        return len(value)
    return 1


def _display_candidate(value: Any | None, key: str, raw_values: tuple[Any, ...] = ()) -> str | None:
    """Return a masked label candidate when it is better than a raw identifier."""
    text = _string_value(value)
    if text is None or not text.strip():
        return None
    masked = mask_value(text.strip(), key)
    if not isinstance(masked, str) or not masked.strip():
        return None
    raw_texts = {str(raw).strip().lower() for raw in raw_values if raw}
    if masked.strip().lower() in raw_texts:
        return None
    return masked.strip()


def _entry_attr(entry: Any | None, attr: str, default: Any = None) -> Any:
    """Read an object or mapping attribute safely."""
    if entry is None:
        return default
    if isinstance(entry, dict):
        return entry.get(attr, default)
    return getattr(entry, attr, default)


def _registry_items(registry: Any | None, collection_name: str) -> list[Any]:
    """Return registry collection values across HA registry implementations."""
    if registry is None:
        return []
    collection = getattr(registry, collection_name, {})
    if hasattr(collection, "values"):
        return list(collection.values())
    return list(collection)


def _string_value(value: Any | None) -> str | None:
    """Return a compact string value."""
    if value is None:
        return None
    if enum_value := getattr(value, "value", None):
        return str(enum_value)
    return str(value)


def _yaml_error_detail(err: Exception) -> str:
    """Return a helpful parse error without leaking file paths."""
    mark = getattr(err, "problem_mark", None)
    if mark is not None:
        return f"YAML parse failed: {type(err).__name__} at line {mark.line + 1}, column {mark.column + 1}."
    return f"YAML parse failed: {type(err).__name__}."


def _entity_fallback(entity_id: str) -> str:
    """Return a compact technical entity fallback."""
    return f"Entity: {_compact_identifier(entity_id)}"


def _identifier_suffix(identifier: str) -> str:
    """Return a short suffix for an internal identifier."""
    text = str(identifier)
    if len(text) <= 8:
        return text
    return f"...{text[-8:]}"


def _compact_identifier(identifier: str, max_length: int = 48) -> str:
    """Return a compact form of a technical identifier."""
    text = str(identifier)
    if len(text) <= max_length:
        return text
    return f"{text[:24]}...{text[-16:]}"
