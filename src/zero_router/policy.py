"""Deterministic privacy-first routing for ZERO creative jobs.

This module plans a route only. It does not upload files, call providers,
start workers, or perform image/video processing.
"""

from dataclasses import dataclass
from enum import Enum
from typing import FrozenSet, Optional


class Classification(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    SENSITIVE = "sensitive"


class Engine(str, Enum):
    PRIVATE_LOCAL = "private_local"
    CLOUD = "cloud"
    NONE = "none"


class Operation(str, Enum):
    IMAGE_GENERATION = "image_generation"
    GENERATIVE_INPAINTING = "generative_inpainting"
    BACKGROUND_SEGMENTATION = "background_segmentation"
    IMAGE_UPSCALING = "image_upscaling"
    DENOISE_RESTORE = "denoise_and_restore"
    COLOR_ADJUSTMENT = "color_adjustment"
    VIDEO_TRANSCODING = "video_transcoding"
    VIDEO_TIMELINE_EDITING = "video_timeline_editing"
    AI_VIDEO_GENERATION = "ai_video_generation"


@dataclass(frozen=True)
class JobRequest:
    operation: Operation
    classification: Classification = Classification.PRIVATE
    cloud_consent: bool = False
    requested_engine: Optional[Engine] = None


@dataclass(frozen=True)
class EngineCapabilities:
    enabled: bool
    supported_operations: FrozenSet[Operation]

    def supports(self, operation: Operation) -> bool:
        return self.enabled and operation in self.supported_operations


@dataclass(frozen=True)
class RouteDecision:
    allowed: bool
    engine: Engine
    reason: str
    requires_cloud_upload: bool = False


_CLOUD_PREFERRED = frozenset({Operation.IMAGE_GENERATION, Operation.AI_VIDEO_GENERATION})


def choose_engine(
    job: JobRequest,
    private_local: EngineCapabilities,
    cloud: EngineCapabilities,
) -> RouteDecision:
    """Choose an engine without ever silently sending private media to cloud."""
    local_ok = private_local.supports(job.operation)
    cloud_ok = cloud.supports(job.operation)
    cloud_permitted = (
        job.classification is Classification.PUBLIC and job.cloud_consent
    )

    if job.requested_engine is Engine.PRIVATE_LOCAL:
        if local_ok:
            return RouteDecision(True, Engine.PRIVATE_LOCAL, "Requested private engine supports this operation.")
        return RouteDecision(False, Engine.NONE, "Requested private engine is unavailable or lacks this capability.")

    if job.requested_engine is Engine.CLOUD:
        if not cloud_permitted:
            return RouteDecision(False, Engine.NONE, "Cloud routing requires public data classification and explicit per-job consent.")
        if cloud_ok:
            return RouteDecision(True, Engine.CLOUD, "Cloud explicitly requested and permitted.", True)
        return RouteDecision(False, Engine.NONE, "Cloud engine is unavailable or lacks this capability.")

    if job.operation in _CLOUD_PREFERRED and cloud_permitted and cloud_ok:
        return RouteDecision(True, Engine.CLOUD, "Cloud-preferred operation; explicit consent is present.", True)

    if local_ok:
        return RouteDecision(True, Engine.PRIVATE_LOCAL, "Private engine selected by privacy-first policy.")

    if job.classification is not Classification.PUBLIC:
        return RouteDecision(False, Engine.NONE, "Private/sensitive media cannot fall back to cloud; private engine lacks this capability.")

    if cloud_permitted and cloud_ok:
        return RouteDecision(True, Engine.CLOUD, "Private engine lacks this capability; cloud fallback explicitly approved.", True)

    if cloud_ok and not job.cloud_consent:
        return RouteDecision(False, Engine.NONE, "Cloud is capable, but explicit per-job consent is missing.")

    return RouteDecision(False, Engine.NONE, "No enabled engine supports this operation.")
