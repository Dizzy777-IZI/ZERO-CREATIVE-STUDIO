# ZERO Creative Studio

**Owner:** Dizzy777-IZI  
**Visibility:** Private  
**Purpose:** AI-assisted production workspace for photo, video, graphic design, and social-media content.

## Mission

Turn creative briefs into reviewable, high-quality deliverables through repeatable workflows, careful quality control, and honest reporting of what was actually created and verified.

## Dual-engine strategy

ZERO is designed around two complementary processing paths:

- **Cloud Engine:** optional hosted generative services for capabilities that benefit from large hosted models or specialized APIs.
- **Private Local-Inference Engine:** models execute on a separately managed, owner-controlled worker. This does not require installing AI runtimes or consuming RAM/VRAM on the owner's PC.

Private processing is the default. Source media must not be sent to a cloud provider without explicit per-job consent, and there is no silent cloud fallback. "Offline inference" means the private worker can run inference without outbound internet after provisioning; the complete job submission workflow still requires a controlled private connection.

See [Dual-Engine Architecture](docs/DUAL-ENGINE-ARCHITECTURE.md), [Routing Policy](ai-workflows/engine-routing.yaml), and [Implementation Roadmap](docs/DUAL-ENGINE-ROADMAP.md).

## Workstreams

- **Photo editing:** analysis, retouching, enhancement, compositing, object/background edits, and generative editing.
- **Video editing:** story structure, selects, cuts, pacing, captions, audio, color, and export.
- **Social media:** TikTok, Instagram Reels, covers, captions, and content packages.
- **AI workflows:** model/tool selection, prompt design, evaluation, privacy, and local/cloud trade-offs.
- **Tools and automation:** scripts and applications that support creative production.
- **Commercial operations:** briefs, scope, revisions, licensing, quality standards, and cost estimation.

## Repository map

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── DUAL-ENGINE-ARCHITECTURE.md
│   └── DUAL-ENGINE-ROADMAP.md
├── photo-editing/
├── video-editing/
├── social-media/
├── ai-workflows/
│   ├── README.md
│   └── engine-routing.yaml
├── tools/
├── automation/
└── changelog/
```

Directories receive executable implementation as concrete workflows and tools are built. Do not add private client media or personal source files without explicit approval.

## Production principles

1. Inspect the brief, source assets, metadata, project instructions, and available tools before making changes.
2. Preserve original media; write derivatives and exports separately.
3. Match the requested platform, format, language, and creative direction.
4. Distinguish actual edits from generative reconstruction and recommendations.
5. Respect privacy, licensing, copyright, and commercial usage rights.
6. Verify current platform specifications when exact technical limits matter.
7. Never claim an edit, render, build, test, or runtime behavior was completed unless it was actually performed and checked.
8. Do not describe a workflow as offline unless all required models and dependencies run locally on the designated worker.

## Current status

The dual-engine architecture, privacy-first routing policy, and photo/video workflow specifications are documented on the feature branch. The router is not yet executable. No GPU worker, model runtime, cloud provider adapter, job queue, production photo/video pipeline, or rendering service is deployed. Follow [the roadmap](docs/DUAL-ENGINE-ROADMAP.md) and update this status only when implementation and relevant checks exist.
