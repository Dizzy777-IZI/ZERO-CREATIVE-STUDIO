# Cloudflare Free — ZERO control-plane preparation

## Decision

Cloudflare Pages + Workers is the temporary Rp0 hosting target for the lightweight
dashboard and read-only control API. It is not a Linux VPS and is not an inference
host. No Cloudflare account, project, Worker, Pages site, domain, or resource has
been created by this repository change.

## Included scaffold

- `web/cloudflare/index.html`: static Indonesian dashboard preview.
- `src/cloudflare/worker.js`: read-only `GET /healthz` and `GET /api/status`
  endpoints. Other methods and paths are rejected.
- `wrangler.toml`: minimal Workers configuration with no bindings, secrets,
  routes, custom domains, storage, or paid features.

The public status response contains only non-sensitive capability flags. Do not
add credentials, user media, personal data, job payloads, or private metadata to
these endpoints.

## Free-tier guardrails

Cloudflare's current Workers Free documentation lists 100,000 requests/day,
10 ms CPU time per invocation, and 128 MB memory. Pages Free currently lists
500 builds/month and one concurrent build. Recheck official limits before use:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/

The Workers Paid plan has a minimum monthly charge. Do not enable Paid, Workers
Paid, paid add-ons, paid storage, or any usage-based service. Do not add a
payment method just to proceed. If the console requires a payment method or
shows a charge, stop and request review.

## Manual deployment gate

1. The owner creates/signs in to their Cloudflare account and confirms the
   account is on the Free plan.
2. Create a Pages project connected to this GitHub repository:
   - Root directory: `web/cloudflare`
   - Build command: none
   - Build output directory: `.`
3. Create a Worker from the repository using the root `wrangler.toml`, or
   deploy with Wrangler after installing it on an owner-controlled environment.
4. Do not add custom domains, storage bindings, queues, databases, secrets, or
   paid products in this initial phase.
5. Test `/healthz` and `/api/status`. Confirm the response keeps all inference
   and media-upload flags false.
6. Review the Cloudflare dashboard billing/plan page after setup. Stop if any
   paid plan or charge is shown.

No deployment is performed by CI. Do not paste API tokens, passwords, or
account credentials into chat or GitHub.

## Runtime boundaries

- Suitable: static dashboard, lightweight read-only API, project health/status.
- Not suitable: Linux shell/daemon, long-running jobs, GPU workloads, AI model
  inference, video rendering, or persistent local filesystem processing.
- AI inference remains unavailable until a separate private worker is
  provisioned or a cloud provider is explicitly approved.
- No automatic media upload or cloud fallback is permitted.
- The user's personal PC is not a worker.

## Validation

The Worker is deliberately small and has no external dependencies. Before
deployment, validate JavaScript syntax and manually smoke-test both endpoints.
A successful GitHub CI run does not prove that a Cloudflare deployment exists.
