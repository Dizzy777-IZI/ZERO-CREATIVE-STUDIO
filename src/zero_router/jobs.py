"""Validated, dependency-light job request schema for ZERO."""

from dataclasses import dataclass
from typing import Any, Mapping

from .policy import Classification, Engine, JobRequest, Operation


@dataclass(frozen=True)
class JobManifest:
    """A validated, serializable description of one media-processing job."""

    job_id: str
    operation: Operation
    classification: Classification = Classification.PRIVATE
    cloud_consent: bool = False
    requested_engine: Engine | None = None
    input_media: tuple[str, ...] = ()
    output_format: str | None = None

    def to_policy_request(self) -> JobRequest:
        return JobRequest(
            operation=self.operation,
            classification=self.classification,
            cloud_consent=self.cloud_consent,
            requested_engine=self.requested_engine,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema_version": 1,
            "job_id": self.job_id,
            "operation": self.operation.value,
            "classification": self.classification.value,
            "cloud_consent": self.cloud_consent,
            "requested_engine": self.requested_engine.value if self.requested_engine else None,
            "input_media": list(self.input_media),
            "output_format": self.output_format,
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "JobManifest":
        if not isinstance(payload, Mapping):
            raise ValueError("Job manifest must be an object.")
        if payload.get("schema_version") != 1:
            raise ValueError("Unsupported or missing job schema_version; expected 1.")

        job_id = payload.get("job_id")
        if not isinstance(job_id, str) or not job_id.strip():
            raise ValueError("job_id must be a non-empty string.")

        try:
            operation = Operation(payload.get("operation"))
            classification = Classification(payload.get("classification", "private"))
            requested_raw = payload.get("requested_engine")
            requested_engine = Engine(requested_raw) if requested_raw is not None else None
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid operation, classification, or requested_engine: {exc}") from exc

        consent = payload.get("cloud_consent", False)
        if not isinstance(consent, bool):
            raise ValueError("cloud_consent must be a boolean.")

        media = payload.get("input_media", [])
        if not isinstance(media, list) or any(not isinstance(item, str) or not item.strip() for item in media):
            raise ValueError("input_media must be a list of non-empty path or asset identifiers.")

        output_format = payload.get("output_format")
        if output_format is not None and (not isinstance(output_format, str) or not output_format.strip()):
            raise ValueError("output_format must be a non-empty string when provided.")

        return cls(
            job_id=job_id.strip(),
            operation=operation,
            classification=classification,
            cloud_consent=consent,
            requested_engine=requested_engine,
            input_media=tuple(media),
            output_format=output_format,
        )
