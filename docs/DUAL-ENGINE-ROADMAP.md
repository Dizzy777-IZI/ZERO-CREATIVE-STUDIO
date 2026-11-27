# ZERO Creative Studio — Execution Roadmap

This document is the source of truth for implementation status. A feature is not "done" merely because a plan or UI mockup exists. Distinguish merged code, automated checks, manual QA, and deployed runtime behavior.

## Verified repository snapshot

- Default branch: `main`.
- Photo editor v1: merged via PR #9 into `main`.
- Video editor beta + AI editing contract: PR #10 is open as a draft; do not describe it as merged or deployed.
- Latest PR #10 GitHub Actions run inspected: success. This run executes Python unit tests and Node static/safety assertions; it does not prove browser codec compatibility or real export playback.
- Cloudflare dashboard/Worker: source scaffold only; no live deployment was verified.
- AI image/video inference: disabled. No model worker is provisioned and no hosted provider is enabled.
- Owner operating constraint: Rp0/month unless the owner explicitly approves a cost.

## Status matrix

| Order | Workstream | Current verified state | Exit criteria |
|---|---|---|---|
| 0 | Repository and privacy baseline | Merged in main | CI and policy tests pass |
| 1 | Photo editor v1 | Merged in main (PR #9) | Browser QA for formats, limits, adjustments, rotation, export, memory handling |
| 2 | Photo editor v2 | Not started | Crop, flip, exposure controls, undo/redo, safe object URL lifecycle, robust large-image handling, expanded tests |
| 3 | Video editor beta | Draft PR #10; CI run passed | Fix export race/error cleanup; browser QA on Chrome/Edge; verify WebM output playback |
| 4 | Video editor v2 | Not started | Multi-clip timeline, split/trim, audio track, captions, transitions, deterministic export pipeline |
| 5 | AI adapter contract | Documented in draft PR #10 | Merge reviewed contract and add executable disabled adapter + validation tests |
| 6 | AI inference engine | Blocked | Owner-approved compute, model/license review, resource benchmark, privacy/cost gates |
| 7 | Social publishing toolkit | Planned | Reusable 9:16 presets, subtitle styles, cover/caption templates, export validation |
| 8 | Unified dashboard | Static preview only | Route to real tools, accessible status, no false "live" indicators |
| 9 | Business workflow | Documentation baseline | Brief intake, quote, revision tracking, deliverable manifest, licensing checklist |

## Immediate execution sequence

### Step 1 — Photo editor v1 hardening
1. Test JPEG, PNG, WebP, AVIF where browser support exists.
2. Test corrupt files, MIME spoofing, zero-byte files, oversized files, and images above 40 MP.
3. Fix stale image-load races and object URL cleanup on every failure path.
4. Guard canvas/context failures and handle `toBlob` errors.
5. Test export dimensions and visually inspect PNG output.
6. Record browser/version and test evidence.

### Step 2 — Photo editor v2
Implement only after v1 hardening:
- Crop with aspect presets (free, 1:1, 4:5, 9:16, 16:9).
- Horizontal/vertical flip.
- Exposure, highlights, shadows, temperature/tint, and vibrance where supported by a tested rendering path.
- Undo/redo using bounded edit-state history (not duplicated full-resolution bitmaps).
- Non-destructive source handling and predictable export naming.
- Tests for crop bounds, rotation/flip combinations, reset, undo/redo, and memory limits.

Generative inpainting, identity retouch, and model-based upscaling remain unavailable until an actual approved inference adapter exists.

### Step 3 — Video editor beta review
PR #10 currently provides local preview, one trim range, and WebM MediaRecorder export. Before merge:
- Register seek listeners before changing currentTime; handle an already-satisfied seek.
- Centralize cleanup for success, error, cancellation, and page unload.
- Reject empty/zero-byte output rather than announcing success.
- Verify the exported file's duration and playback in supported browsers.
- Keep explicit limitations visible (real-time capture, browser codec dependence, no multitrack timeline).

### Step 4 — Video editor v2
Use a deterministic edit-decision manifest and a real rendering path. Do not pretend that a browser preview is a completed export. Evaluate FFmpeg/WebCodecs/browser support and license implications before selecting an implementation. Add multi-clip timeline, audio mixing, subtitles, transitions, and export validation incrementally.

### Step 5 — AI adapter and inference
- Keep both engines disabled by default.
- Implement capabilities, validate, estimate, execute, and health contracts.
- Return a structured `ENGINE_DISABLED` error until a real engine is provisioned.
- Never upload PRIVATE or SENSITIVE assets to a cloud provider.
- Require explicit per-job consent for any permitted cloud transfer.
- Verify model license, commercial rights, memory/VRAM requirements, data retention, cost, cancellation, and deletion policy before activation.
- Do not use trial credits, payment cards, paid plans, or usage billing under the Rp0 constraint.

### Step 6 — Social and business workflow
- TikTok/Instagram 9:16 output presets with safe-area guides.
- Subtitle readability and spelling checks.
- Cover/thumbnail templates and brand presets.
- Caption/hashtag suggestions framed as hypotheses, never guarantees.
- Client brief, scope, revision, rights, and delivery manifests.

## Required validation gates

For every code change:
1. Static/unit tests pass.
2. Security/privacy checks pass.
3. Browser/runtime smoke test is performed when the feature is browser-facing.
4. Export is reopened and inspected when media output is involved.
5. Documentation and status table are updated to match observed evidence.

## Non-goals for the Rp0 phase

- No GPU worker provisioning.
- No paid inference APIs.
- No automatic media upload.
- No Cloudflare Worker used as a long-running renderer or GPU host.
- No claim of offline AI without verified model weights and runtime on an owner-controlled worker.

## Reporting format

Each progress report must separate:
- Implemented and committed
- CI/test results
- Browser/manual QA
- Deployment/runtime verification
- Blockers and next reproducible action
