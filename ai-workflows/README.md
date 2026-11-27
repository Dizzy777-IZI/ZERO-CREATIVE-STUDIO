# AI Workflows

This directory defines model and engine workflows used by ZERO.

## Current files

- `engine-routing.yaml` — privacy-first routing policy and deployment flags.
- `../docs/DUAL-ENGINE-ARCHITECTURE.md` — system architecture, network semantics, phases, and quality gates.

## Current implementation status

The routing YAML is a policy/configuration baseline only. It is not yet consumed by a running router. Both engine deployments remain planned; no model runtime, API adapter, job queue, or server is connected.

## Key design decision

Private inference runs on an owner-controlled worker separate from the owner's PC. It can run without outbound internet during inference after provisioning. A controlled private network path is still needed to submit jobs and retrieve outputs.

Cloud processing is disabled by default. Do not upload user media to a hosted provider without explicit per-job consent.

## Next engineering increment

Implement a provider-neutral job schema and routing validator with tests. Keep provider credentials and model weights outside Git.
