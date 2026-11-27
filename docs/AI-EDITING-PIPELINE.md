# ZERO AI Editing Pipeline — Rp0-safe foundation

## Purpose
Define a provider-neutral AI editing contract for image and video workflows without enabling inference, paid APIs, media upload, or background processing. This is an implementation boundary, not a claim that generative AI is available.

## Current operating state
- AI image and video inference: DISABLED.
- Cloud provider calls: DISABLED.
- Private inference worker: NOT PROVISIONED.
- Browser-local tools may run only deterministic operations implemented by the editor.
- No source media may leave the browser without future explicit, per-job consent and a verified privacy/cost policy.
- PRIVATE and SENSITIVE media must never be routed to cloud. PUBLIC media still requires explicit consent before cloud routing.
- No silent fallback between engines.

## Job contract
Every future AI edit job must declare job_id, schema_version, media_type (image or video), operation, source asset references, privacy_classification (PRIVATE, SENSITIVE, or PUBLIC), engine_preference (private, cloud, or none), cloud_consent (boolean, default false), output format/dimensions/quality, resource limits, status, and structured error code.

A request must fail closed if fields are missing, the selected engine is disabled, privacy requirements are not met, or a resource limit is exceeded.

## Image operation catalogue
Future adapter capabilities may include denoise, deblur, upscale, restoration, segmentation, background removal, inpainting/object removal, generative fill, style transfer, and user-controlled face/skin retouch. Each operation must expose model identifier/version, license, input/output constraints, safety limitations, and whether it modifies identity-defining facial/body characteristics. Preserve originals and record derivatives separately.

## Video operation catalogue
Future adapter capabilities may include scene/shot detection, clip selection, transcription/subtitles, object tracking/masking, stabilization, denoise/upscale, color matching, generative frame/video operations, audio cleanup, and beat-aware edit suggestions.

Long jobs require an actual worker/queue, cancellation, progress reporting, storage policy, and bounded temporary files. Cloudflare Workers are not a video-rendering or GPU inference host.

## Adapter interface
A provider adapter must implement:
- capabilities(): report supported operations and limits without executing jobs.
- validate(job): reject unsupported or unsafe requests.
- estimate(job): report resource/cost requirements before execution.
- execute(job, progress, abortSignal): execute only when the engine is explicitly enabled.
- health(): report readiness without leaking secrets.

The current runtime must return ENGINE_DISABLED for AI execution. Mock adapters may be used only in tests and must never be presented as generated media.

## Quality and privacy gates
1. Keep source media immutable.
2. Require preview/approval before replacing or publishing outputs.
3. Record model/license/version and job parameters for reproducibility.
4. Enforce file-size, pixel-count, duration, and memory ceilings before processing.
5. Do not upload media for telemetry or debugging.
6. Delete temporary artifacts according to a documented retention policy.
7. Test malformed jobs, disabled engines, private-media routing, consent defaults, cancellation, and oversized media.

## Rp0 activation rule
Do not download model weights or enable an inference service as part of this phase. AI execution stays unavailable until an owner-controlled zero-cost compute option is verified, its license and capacity reviewed, and the user explicitly approves provisioning. Any card, billing, paid plan, usage charge, or trial-credit dependency blocks activation.
