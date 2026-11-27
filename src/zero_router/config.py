"""Load and validate ZERO's versioned YAML routing policy."""

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .policy import Engine, EngineCapabilities, Operation


@dataclass(frozen=True)
class RoutingConfig:
    version: int
    default_mode: str
    allow_cloud_upload_by_default: bool
    silent_cloud_fallback: bool
    preserve_originals: bool
    private_local_enabled: bool
    cloud_enabled: bool
    preferred_engines: dict[Operation, Engine]
    fallback_engines: dict[Operation, Engine]

    def capabilities(self) -> tuple[EngineCapabilities, EngineCapabilities]:
        local_ops = frozenset(
            op for op, preferred in self.preferred_engines.items()
            if preferred is Engine.PRIVATE_LOCAL
        ) | frozenset(
            op for op, fallback in self.fallback_engines.items()
            if fallback is Engine.PRIVATE_LOCAL
        )
        cloud_ops = frozenset(
            op for op, preferred in self.preferred_engines.items()
            if preferred is Engine.CLOUD
        ) | frozenset(
            op for op, fallback in self.fallback_engines.items()
            if fallback is Engine.CLOUD
        )
        return (
            EngineCapabilities(self.private_local_enabled, local_ops),
            EngineCapabilities(self.cloud_enabled, cloud_ops),
        )


def load_routing_config(path: str | Path) -> RoutingConfig:
    """Read the repository YAML policy; never enable an unconfigured engine."""
    try:
        raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise ValueError(f"Unable to read routing configuration: {exc}") from exc

    if not isinstance(raw, dict) or raw.get("version") != 1:
        raise ValueError("Routing config must be an object with version: 1.")

    routing = raw.get("routing")
    engines = raw.get("engines")
    operations = raw.get("operations")
    if not all(isinstance(section, dict) for section in (routing, engines, operations)):
        raise ValueError("Routing config requires routing, engines, and operations objects.")

    if routing.get("default_mode") != "privacy_first":
        raise ValueError("Only privacy_first routing is supported.")
    if routing.get("allow_cloud_upload_by_default") is not False:
        raise ValueError("Cloud upload must remain disabled by default.")
    if routing.get("silent_cloud_fallback") is not False:
        raise ValueError("Silent cloud fallback must remain disabled.")
    if routing.get("preserve_originals") is not True:
        raise ValueError("Original media preservation must remain enabled.")

    for name in ("private_local", "cloud"):
        if not isinstance(engines.get(name), dict) or not isinstance(engines[name].get("enabled"), bool):
            raise ValueError(f"engines.{name}.enabled must be a boolean.")

    preferred: dict[Operation, Engine] = {}
    fallback: dict[Operation, Engine] = {}
    for operation_name, settings in operations.items():
        try:
            operation = Operation(operation_name)
        except ValueError as exc:
            raise ValueError(f"Unknown operation in routing config: {operation_name}") from exc
        if not isinstance(settings, dict):
            raise ValueError(f"Operation {operation_name} settings must be an object.")
        try:
            preferred[operation] = Engine(settings["preferred_engine"])
            if "fallback_engine" in settings:
                fallback[operation] = Engine(settings["fallback_engine"])
        except (KeyError, ValueError) as exc:
            raise ValueError(f"Invalid engine mapping for operation {operation_name}.") from exc

    return RoutingConfig(
        version=1,
        default_mode="privacy_first",
        allow_cloud_upload_by_default=False,
        silent_cloud_fallback=False,
        preserve_originals=True,
        private_local_enabled=engines["private_local"]["enabled"],
        cloud_enabled=engines["cloud"]["enabled"],
        preferred_engines=preferred,
        fallback_engines=fallback,
    )
