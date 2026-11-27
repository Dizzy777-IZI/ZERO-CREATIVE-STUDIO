# ZERO Dual-Engine Roadmap

This roadmap tracks implementation gates, not promises or assumed completion.

| Phase | Deliverable | Exit criteria | Status |
|---|---|---|---|
| A | Dual-engine architecture and privacy policy | Privacy, fallback, and deployment semantics documented | Complete |
| B | Routing core, job schema, and config integration | Deterministic router, validated job schema, config-driven capabilities, and unit tests | Complete — merged to main; CI passed on Python 3.11 and 3.12 |
| C1 | Oracle Always Free preparation | OCI profile, strict zero-cost guardrails, and documentation validated | Complete — PR #4 merged; CI passed; no OCI resources created |
| C2 | Private inference worker | Server selected, model licenses checked, health and offline-inference tests pass | Blocked — no separate inference worker or GPU budget |
| C3 | Cloudflare free control plane | Static dashboard and read-only status Worker pass validation; owner deploys under Free plan | In preparation — scaffold in review; no account or deployment exists |
| D | Cloud adapter | Provider/API verified, consent gate and cost controls tested | Blocked — no approved provider or API budget |
| E | Orchestration | Queue, progress, cancellation, previews, and exports tested end-to-end | Planned |
| F | Production hardening | Auth, quotas, retention, monitoring, backup, security and recovery tests pass | Planned |

## Phase B implementation

- Dependency-free privacy policy core for route decisions.
- Versioned `JobManifest` with validation and serialization.
- YAML routing-policy loader with strict privacy defaults.
- Runtime capabilities are derived from configured operations and engine enablement.
- Tests cover malformed manifests, invalid config, cloud-consent defaults, and disabled engines.
- Expanded suite passed in GitHub Actions on Python 3.11 and 3.12 (15 tests total).

## Oracle Always Free preparation

- `infra/oracle/always-free.yaml` is a policy profile, not a deployment manifest.
- A Python validator rejects non-A1 shapes, resource values above the published Always Free ceilings, GPU use, paid fallback, public ingress, and runtime activation.
- `docs/ORACLE-ALWAYS-FREE-PREP.md` documents manual account and provisioning gates, home-region rules, idle reclamation thresholds, and signup verification caveats.
- PR #4 merged after Python 3.11 and 3.12 CI checks passed. PR #5 merged with additional operational caveats; CI passed.
- No OCI account, VM, network, storage, or paid service has been created.

## Cloudflare free control-plane preparation

- `web/cloudflare/index.html` is a static dashboard preview.
- `src/cloudflare/worker.js` exposes only read-only `GET /healthz` and `GET /api/status` endpoints.
- `wrangler.toml` contains no bindings, secrets, storage, custom domains, or routes.
- `docs/CLOUDFLARE-FREE-PREP.md` defines the manual Free-plan deployment gate and cost guardrails.
- This is not a VPS, Linux shell, persistent worker, GPU host, or inference runtime.
- No Cloudflare account, project, Worker, Pages deployment, or billing configuration has been created.

## Rp0/month operating mode

- No paid GPU server, hosted inference API, or cloud media upload is enabled.
- Both engines are disabled in `ai-workflows/engine-routing.yaml`.
- Development uses repository code, unit tests, and GitHub Actions; no model downloads or local AI runtime are required.
- A job requiring inference must be reported as unavailable until an engine is provisioned. It must never be silently redirected to another engine.
- Do not enable Cloudflare Paid, paid add-ons, usage-based services, or paid storage.

## Constraints to resolve before private inference

- Separate worker location and monthly GPU budget.
- Whether the first private worker is CPU-only or GPU-backed.
- Required image/video formats, sizes, and throughput.
- Candidate model licenses and commercial-use terms.
- Data retention and backup policy.

## Constraints to resolve before cloud inference

- First cloud provider and supported image/video APIs.
- Per-job consent UX.
- Provider data retention and training policy.
- Pricing, rate limits, region, and commercial-use rights.

## Operating rule

Never route private media to cloud automatically. If the private worker cannot handle a job, queue/fail explicitly or ask for consent before cloud processing.
