# ZERO Dual-Engine Roadmap

This roadmap tracks implementation gates, not promises or assumed completion.

| Phase | Deliverable | Exit criteria | Status |
|---|---|---|---|
| A | Dual-engine architecture and routing policy | Privacy, fallback, and deployment semantics documented | Complete |
| B | Job schema and routing validator | Schema validation and deterministic unit tests pass | Next |
| C | Private inference worker | Server selected, model licenses checked, health and offline-inference tests pass | Planned |
| D | Cloud adapter | Provider/API verified, consent gate and cost controls tested | Planned |
| E | Orchestration | Queue, progress, cancellation, previews, and exports tested end-to-end | Planned |
| F | Production hardening | Auth, quotas, retention, monitoring, backup, security and recovery tests pass | Planned |

## Constraints to resolve before Phase C

- Hosting location and monthly GPU budget.
- Whether the first private worker is CPU-only or GPU-backed.
- Required image/video formats, sizes, and throughput.
- Candidate model licenses and commercial-use terms.
- Data retention and backup policy.

## Constraints to resolve before Phase D

- First cloud provider and supported image/video APIs.
- Per-job consent UX.
- Provider data retention and training policy.
- Pricing, rate limits, region, and commercial-use rights.

## Operating rule

Never route private media to cloud automatically. If the private worker cannot handle a job, queue/fail explicitly or ask for consent before cloud processing.
