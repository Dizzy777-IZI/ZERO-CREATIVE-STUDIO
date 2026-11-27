# Cloudflare Free — ZERO control-plane

## Architecture

- Worker service name: `zero-creative-studio` (must match `wrangler.toml`).
- Worker entry point: `src/cloudflare/worker.js`.
- Static dashboard source: `web/cloudflare/index.html`, intended for a separate Pages project.
- Worker exposes only `GET /healthz` and `GET /api/status`; other methods and paths are rejected.
- No inference, media upload, queue, storage, secrets, or paid-service bindings are configured.

Cloudflare Workers is not a Linux VPS or AI inference host. Pages and Workers are separate products and should be configured as separate projects.

## Required Workers Builds settings

For the existing Worker connected to this GitHub repository, verify these values in the Cloudflare dashboard:

| Setting | Required value |
|---|---|
| Repository | `Dizzy777-IZI/ZERO-CREATIVE-STUDIO` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | Leave empty |
| Deploy command | `npm run deploy` |
| Version command | Leave empty unless Cloudflare requires a supported default |
| Wrangler config | `wrangler.toml` at repository root |
| Worker name | `zero-creative-studio` |

Use `npm run deploy` as the only production Deploy command. The repository pins Wrangler in `devDependencies`, and this script invokes that local installation. Leave the Build command empty so Cloudflare does not run a second build step for this Worker. Temporarily turn Preview Builds OFF: the repository does not currently define a verified preview-deployment workflow. Do not use `wrangler preview`; it is not the project's deployment command. Re-enable Preview Builds only after a separate preview deployment command has been implemented and tested.

For preview builds, enable Preview Builds only if the account exposes the feature without enabling a paid plan. Protect preview deployments with Cloudflare Access only when an Access application/policy is already configured and tested; otherwise leave protection disabled until it can be configured without a paid upgrade or locking out the owner.

## Pages dashboard settings

Configure Pages separately from the Worker:

| Setting | Required value |
|---|---|
| Repository | `Dizzy777-IZI/ZERO-CREATIVE-STUDIO` |
| Production branch | `main` |
| Root directory | `web/cloudflare` |
| Build command | Leave empty |
| Build output directory | `.` |

Do not point the Pages project at the Worker root or use `wrangler deploy` as the Pages build command.

## Rp0 cost guardrails

- Keep the account and Worker on the Free plan.
- Do not enable Workers Paid, paid add-ons, paid storage, or usage-based services.
- Do not add a payment method just to proceed.
- If the console requires a payment method, shows a charge, or proposes an upgrade, stop.
- Recheck current official limits and account billing state before enabling new features.

Official references:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/workers/platform/pricing/

## Smoke tests

1. `GET /healthz`: HTTP 200 and JSON `{"status":"ok","service":"zero-creative-studio"}`.
2. `GET /api/status`: HTTP 200; cloud inference, private inference, and media upload flags must all be `false`.
3. `POST /api/status`: HTTP 405.
4. Unknown path: HTTP 404.
5. Confirm Pages dashboard separately using its own production URL.
6. Review account plan/billing; stop if any paid plan or charge appears.

Never paste API tokens, passwords, or account credentials into chat or GitHub.

## Privacy and runtime boundaries

- Public status endpoints must never expose credentials, personal data, user media, job payloads, or private metadata.
- No automatic media upload or cloud fallback is permitted.
- Private/sensitive media must never be routed to cloud.
- The user's personal PC is not a worker.
- AI inference and media processing remain unavailable until a separate approved engine is actually provisioned and tested.
- GitHub CI success does not prove Cloudflare deployment success; a live URL and successful endpoint checks are required.
