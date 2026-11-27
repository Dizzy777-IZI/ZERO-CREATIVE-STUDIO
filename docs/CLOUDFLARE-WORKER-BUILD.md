# Cloudflare Worker build contract

This repository's Worker is a read-only control plane. The checked-in Worker service name, Wrangler config, npm script, and Cloudflare Builds settings must agree.

## Repository contract

- Repository: `Dizzy777-IZI/ZERO-CREATIVE-STUDIO`
- Production branch: `main`
- Root directory: repository root (`/`)
- Wrangler config: `wrangler.toml`
- Worker name: `zero-creative-studio`
- Entry point: `src/cloudflare/worker.js`
- Deploy command: `npm run deploy`
- Build command: leave empty (no separate compile step)
- Version command: leave empty unless Cloudflare requires a supported default
- Preview Builds: keep disabled until a dedicated preview workflow is verified

The root `package.json` pins Wrangler and defines the deploy script. Cloudflare must install project dependencies before running the deploy command. CI runs the same deploy script with `--dry-run`, which validates the bundle without publishing it.

## Required post-build checks

1. `GET /healthz` returns HTTP 200 and identifies `zero-creative-studio`.
2. `GET /api/status` returns HTTP 200 with inference and media-upload flags all false.
3. POST requests return HTTP 405.
4. Unknown routes return HTTP 404.
5. Confirm the Worker deployment in the correct Cloudflare account and inspect its build log.
6. Confirm the account remains on the Free plan. Stop if the dashboard requires an upgrade, payment method, or paid add-on.

This document does not claim that a Cloudflare deployment has been completed. The account owner must verify the actual dashboard settings and successful deployment. Never commit API tokens, passwords, or Cloudflare credentials.
