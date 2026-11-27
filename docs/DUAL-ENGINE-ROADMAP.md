# ZERO Dual-Engine Roadmap

This roadmap tracks implementation gates, not promises or assumed completion.

| Phase | Deliverable | Exit criteria | Status |
|---|---|---|---|
| A | Dual-engine architecture and privacy policy | Privacy, fallback, and deployment semantics documented | Complete |
| B | Routing core, job schema, and config integration | Deterministic router, validated job schema, config-driven capabilities, and unit tests | In progress — routing core and 8 tests complete |
| C | Private inference worker | Server selected, model licenses checked, health and offline-inference tests pass | Planned |
| D | Cloud adapter | Provider/API verified, consent gate and cost controls tested | Planned |
| E | Orchestration | Queue, progress, cancellation, previews, and exports tested end-to-end | Planned |
| F | Production hardening | Auth, quotas, retention, monitoring, backup, security and recovery tests pass | Planned |

## Completed in Phase B

- Dependency-free Python routing policy core.
- Explicit operation, data-classification, engine-capability, and per-job cloud-consent inputs.
- No cloud fallback for private or sensitive data.
- Eight unit tests.
- GitHub Actions tests passed on Python 3.11 and 3.12.

## Remaining Phase B work

- Define and validate a versioned job request schema.
- Load engine capabilities and routing preferences from the YAML policy instead of duplicating them in code.
- Add tests for malformed jobs, unsupported formats, and invalid engine configuration.

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
