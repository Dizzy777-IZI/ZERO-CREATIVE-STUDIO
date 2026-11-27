# Cloudflare Free — ZERO control-plane

## Decision

Cloudflare Pages + Workers is the Rp0 hosting target for the lightweight
dashboard and read-only control API. It is not a Linux VPS and is not an inference
host.

The owner reports completing a Worker deployment on 2026-11-27. The live Worker
URL and endpoint responses have not yet been independently checked from this
repository workflow. Pages dashboard deployment is not confirmed.

## Included scaffold

- `web/cloudflare/index.html`: static Indonesian dashboard for Cloudflare Pages.
- `src/cloudflare/worker.js`: read-only `GET /healthz` and `GET /api/status`
  endpoints. Other methods and paths are rejected.
- `wrangler.toml`: minimal Workers configuration with no bindings, secrets,
  routes, custom domains, storage, or paid features.

The public status response contains only non-sensitive capability flags. Do not
add credentials, user media, personal data, job payloads, or private metadata to
these endpoints.

## Rp0 cost guardrails

- Keep the account and Worker on the Free plan.
- Do not enable Workers Paid, paid add-ons, paid storage, or usage-based services.
- Do not add a payment method just to proceed.
- If the console requires a payment method, shows a charge, or proposes an upgrade,
  stop and request review.
- Recheck current official limits and account billing state in Cloudflare before
  enabling new features. Free-tier limits can change.

Official references:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/

## Deployment and smoke-test checklist

1. Confirm the Cloudflare account is on the Free plan and no paid add-on is enabled.
2. Confirm the Worker name is `zero-control-api` and it is connected to this repo's
   `main` branch with root directory `/` and the root `wrangler.toml`.
3. Open the deployed Worker URL followed by `/healthz`; expect HTTP 200 and
   JSON containing `"status": "ok"`.
4. Open the same Worker URL followed by `/api/status`; expect HTTP 200 and all
   inference and media-upload flags to remain `false`.
5. Send a POST request to `/api/status`; expect HTTP 405. An unknown path should
   return HTTP 404.
6. Confirm the dashboard's Pages project separately. Its root directory should be
   `web/cloudflare`, build command empty, and output directory `.`.
7. Review the Cloudflare account plan/billing page. Stop if any paid plan or
   charge is shown.

No API token, password, or account credential should be pasted into chat or GitHub.

## Runtime boundaries

- Suitable: static dashboard, lightweight read-only API, project health/status.
- Not suitable: Linux shell/daemon, long-running jobs, GPU workloads, AI model
  inference, video rendering, or persistent local filesystem processing.
- AI inference remains unavailable until a separate private worker is
  provisioned or a cloud provider is explicitly approved.
- No automatic media upload or cloud fallback is permitted.
- The user's personal PC is not a worker.

## Validation

The Worker is deliberately small and has no external dependencies. A successful
GitHub CI run does not prove that a Cloudflare deployment exists. Deployment
claims require a live URL and successful endpoint checks.
