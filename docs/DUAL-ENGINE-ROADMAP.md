# ZERO Dual-Engine Roadmap

This roadmap tracks implementation gates, not promises or assumed completion.

| Phase | Deliverable | Exit criteria | Status |
|---|---|---|---|
| A | Dual-engine architecture and privacy policy | Privacy, fallback, and deployment semantics documented | Complete |
| B | Routing core, job schema, and config integration | Deterministic router, validated job schema, config-driven capabilities, and unit tests | Complete — merged to main; CI passed on Python 3.11 and 3.12 |
| C1 | Oracle Always Free preparation | OCI profile, strict zero-cost guardrails, and documentation validated | Complete — PR #4 merged; no OCI resources created |
| C2 | Private inference worker | Server selected, model licenses checked, health and offline-inference tests pass | Blocked — no separate inference worker or GPU budget |
| C3 | Cloudflare free control plane | Static dashboard and read-only status Worker pass validation; owner deploys under Free plan | In preparation — deployment not live-verified |
| D1 | Browser photo editor | Local photo adjustments, preview, export, privacy checks | Implemented in main; manual browser QA pending |
| D2 | Browser video editor | Local video preview, trim range, WebM export, privacy checks | Implemented on feature branch; CI/manual QA pending |
| D3 | AI editing adapter contract | Job contract, privacy gates, engine-disabled behavior, capability reporting | Specified; executable adapter not connected |
| E | Orchestration | Queue, progress, cancellation, previews, and exports tested end-to-end | Planned |
| F | Production hardening | Auth, quotas, retention, monitoring, backup, security and recovery tests pass | Planned |

## Browser editing foundation

- Photo editor: local JPEG/PNG/WebP/AVIF selection, up to 30 MB and 40 megapixels, brightness/contrast/saturation, 90-degree rotation, PNG export.
- Video editor beta: local MP4/WebM/MOV selection up to 200 MB, preview, one trim range, and WebM export via browser MediaRecorder where supported.
- Both browser tools preserve the source file and do not upload media.
- Browser compatibility, codec support, memory behavior, and real-device exports require manual QA.
- The video editor is not a multi-track timeline and does not yet provide transitions, captions, audio mixing, or advanced effects.

## AI editing foundation

- docs/AI-EDITING-PIPELINE.md defines image/video operation catalogues, job contract, provider adapter interface, privacy gates, and Rp0 activation rule.
- Actual AI inference remains disabled. No model weights are downloaded and no cloud API is called.
- A future engine must pass license, capacity, privacy, cost, cancellation, and output-quality review before activation.

## Cloudflare and Rp0 constraints

- Cloudflare Pages/Workers are a lightweight control plane, not a Linux VPS, GPU host, or long-running video renderer.
- No paid GPU server, hosted inference API, or cloud media upload is enabled.
- Both AI engines remain disabled under the Rp0/month operating mode.
- No paid plan, card, billing, usage-based service, or trial-credit dependency may be enabled.

## Operating rule

Never route private media to cloud automatically. If an engine is unavailable, report it explicitly; do not simulate successful AI output or silently fall back to another engine.
