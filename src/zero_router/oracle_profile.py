"""Validation for ZERO's conservative Oracle Always Free preparation profile.

This module validates a local policy file only. It does not call OCI, provision
resources, inspect billing, or guarantee that a resource is free in a tenancy.
"""
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class OracleFreeProfile:
    shape: str
    architecture: str
    ocpus: int
    memory_gb: int
    boot_volume_gb: int
    max_total_block_storage_gb: int


def load_oracle_free_profile(path: str | Path) -> OracleFreeProfile:
    """Load a deliberately restrictive OCI profile; reject paid or GPU settings."""
    try:
        raw: Any = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise ValueError(f"Unable to read Oracle profile: {exc}") from exc

    if not isinstance(raw, dict) or raw.get("version") != 1:
        raise ValueError("Oracle profile must be an object with version: 1.")
    if raw.get("provider") != "oracle_cloud_infrastructure":
        raise ValueError("Unsupported provider.")
    if raw.get("profile") != "always_free_only":
        raise ValueError("Only the always_free_only profile is permitted.")

    region = raw.get("region")
    compute = raw.get("compute")
    billing = raw.get("billing")
    network = raw.get("network")
    runtime = raw.get("runtime")
    if not all(isinstance(x, dict) for x in (region, compute, billing, network, runtime)):
        raise ValueError("Oracle profile requires region, compute, billing, network, and runtime objects.")

    if region.get("use_tenancy_home_region") is not True:
        raise ValueError("Always Free resources must use the tenancy home region.")
    if compute.get("shape") != "VM.Standard.A1.Flex" or compute.get("architecture") != "arm64":
        raise ValueError("Only the ARM64 VM.Standard.A1.Flex shape is allowed.")
    if type(compute.get("ocpus")) is not int or not 1 <= compute["ocpus"] <= 2:
        raise ValueError("OCPUs must be an integer between 1 and 2.")
    if type(compute.get("memory_gb")) is not int or not 1 <= compute["memory_gb"] <= 12:
        raise ValueError("Memory must be an integer between 1 and 12 GB.")
    if type(compute.get("max_ocpus")) is not int or compute["max_ocpus"] != 2:
        raise ValueError("The OCPU ceiling must remain 2.")
    if type(compute.get("max_memory_gb")) is not int or compute["max_memory_gb"] != 12:
        raise ValueError("The memory ceiling must remain 12 GB.")
    if type(compute.get("boot_volume_gb")) is not int or not 50 <= compute["boot_volume_gb"] <= 200:
        raise ValueError("Boot volume must be between 50 and 200 GB.")
    if type(compute.get("max_total_block_storage_gb")) is not int or compute["max_total_block_storage_gb"] != 200:
        raise ValueError("The total block-storage ceiling must remain 200 GB.")
    if compute.get("gpu_enabled") is not False:
        raise ValueError("GPU resources are not allowed in the Rp0 profile.")

    required_false = (
        (billing, "provisioning_enabled"),
        (billing, "paid_fallback"),
        (billing, "trial_credit_resources_allowed"),
        (network, "expose_database"),
        (runtime, "private_local_enabled"),
        (runtime, "cloud_enabled"),
        (runtime, "cloud_media_upload_enabled"),
        (runtime, "use_personal_pc_as_worker"),
    )
    if any(section.get(key) is not False for section, key in required_false):
        raise ValueError("Provisioning, paid fallback, public database, and runtime engines must remain disabled.")
    if billing.get("mode") not in (None, "always_free_only"):
        raise ValueError("Only Always Free billing mode is permitted.")
    if billing.get("require_always_free_label") is not True:
        raise ValueError("Every OCI resource must be verified as Always Free before creation.")
    if network.get("public_app_ingress_ports") != [] or network.get("ssh_cidr") is not None:
        raise ValueError("Public application ingress and unrestricted SSH are not allowed by default.")

    return OracleFreeProfile(
        shape=compute["shape"],
        architecture=compute["architecture"],
        ocpus=compute["ocpus"],
        memory_gb=compute["memory_gb"],
        boot_volume_gb=compute["boot_volume_gb"],
        max_total_block_storage_gb=compute["max_total_block_storage_gb"],
    )
