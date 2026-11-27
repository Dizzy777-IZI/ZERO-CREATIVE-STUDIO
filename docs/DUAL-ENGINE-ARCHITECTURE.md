# ZERO Dual-Engine Architecture

Status: architecture baseline (not a deployed service).

## Goal

Provide two complementary processing paths behind one creative workflow:

- **Cloud Engine** — optional hosted generative services for tasks that benefit from large hosted models or specialized APIs.
- **Private Local-Inference Engine** — models execute on compute controlled by the project owner, without sending source media to third-party inference APIs.

The word *local* refers to inference running locally on the private worker, not on the user's Windows PC. This is the selected design because the owner wants to use ZERO without installing AI runtimes or consuming the PC's RAM/VRAM. The private worker may be a separately managed GPU server. It is not provisioned yet.

## Important network distinction

An inference worker can run models without outbound internet access after model weights and dependencies have been provisioned. To accept jobs from the ZERO application, it still needs a controlled private inbound connection (for example, a private network or authenticated gateway). Therefore:

- "Offline inference" means no third-party inference API and no required outbound network during inference.
- It does **not** mean the complete ZERO application, browser, and job submission flow work with every network cable disconnected.
- Model download, updates, telemetry checks, and package installation must happen in a separate, approved provisioning phase.
- Do not claim air-gapped operation until network policy and runtime behavior have been tested.

## High-level flow

1. User submits a brief and source media.
2. Job intake validates file type, size, dimensions, duration, and requested operations.
3. Privacy policy classifies the job.
4. Router selects a processing engine using explicit consent, capability, availability, and cost.
5. Worker processes a copy; originals remain immutable.
6. Quality checks inspect output and metadata.
7. User receives preview, final export, and a job report.

## Routing policy

1. **Private by default:** source media is not sent to a cloud provider unless the user explicitly opts in for that job.
2. **No silent fallback:** if private inference is unavailable, fail with a clear status or ask permission to use cloud processing. Never silently upload media.
3. **Capability-aware:** route only to a worker that declares support for the operation, model, input format, and required dimensions.
4. **Cost-aware:** estimate hosted API and GPU-worker costs before expensive jobs when possible.
5. **Reproducible:** record engine, model identifier/version, parameters, application version, and timestamps in a job manifest. Never record secrets.
6. **Reversible:** preserve source files and keep generated derivatives separate.
7. **User-controlled retention:** define and enforce retention/cleanup policy before accepting real client media.

## Engine responsibilities

### Cloud Engine

Suitable for:
- High-quality generative edits and image generation where a hosted model is selected.
- Complex instruction-following edits.
- Hosted video or image capabilities not available on the private worker.

Requirements:
- Per-job opt-in before source media leaves the private environment.
- Provider, model, data handling, pricing, rate limits, and commercial-use terms documented.
- Secrets injected at runtime through a secret manager, never committed.
- Timeouts, retries with limits, cancellation, and provider error mapping.
- Do not assume a provider supports a particular edit until its current API is verified.

### Private Local-Inference Engine

Suitable for:
- Background segmentation/removal.
- Image enhancement, denoising, and upscaling.
- Inpainting and image-to-image models approved for private deployment.
- Video frame processing and local rendering.
- Batch operations where predictable cost and privacy matter.

Requirements:
- Dedicated server/worker; no dependency on the owner's PC hardware.
- Model weights and licenses reviewed before deployment.
- Runtime, CUDA/ROCm/CPU compatibility, VRAM, storage, and throughput measured on the selected server.
- Egress disabled during inference where feasible.
- Authenticated job API, queue limits, resource quotas, and health checks.
- Worker reports exact model and runtime versions.

## Job states

`queued` → `validating` → `awaiting_consent` (when cloud use is requested) → `processing` → `quality_check` → `completed`

Failure/cancellation states: `rejected`, `failed`, `cancelled`.

## Quality gates

- Input and output can be decoded.
- Dimensions, aspect ratio, frame rate, and duration meet the job brief.
- No unintended crop, alpha loss, or orientation change.
- Inspect subject edges, anatomy, text, logos, skin texture, shadows, and generative artifacts.
- For video, inspect playback, black/frozen frames, flicker, subtitle timing, and audio sync.
- Report checks that were not possible; never mark them passed by assumption.

## Deployment phases

1. **Phase A — Contract and routing:** this document and the machine-readable routing policy.
2. **Phase B — Provider-neutral interfaces:** job schema, engine adapter contract, validation, and deterministic tests.
3. **Phase C — Private worker prototype:** select server hardware and compatible models; benchmark before committing to a stack.
4. **Phase D — Cloud adapter:** add one provider only after API, privacy, pricing, and rights review.
5. **Phase E — Orchestration and UI:** queue, progress, consent, cancellation, previews, and export.
6. **Phase F — Production hardening:** auth, quotas, observability, retention, backups, security review, and end-to-end tests.

## Explicit non-goals for this baseline

- No model has been downloaded or deployed.
- No GPU server has been provisioned.
- No third-party provider has been selected or connected.
- No user media is uploaded or processed by this repository change.
- No performance, offline, or production-readiness claim is made.
