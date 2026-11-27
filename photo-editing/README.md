# Photo Editing Pipeline

Status: workflow specification; no executable photo pipeline is connected yet.

## Pipeline

1. Inspect image format, dimensions, color profile, orientation, alpha, and metadata.
2. Preserve the original and create a working derivative.
3. Classify the requested operation: retouch, cleanup, segmentation, compositing, inpainting, generation, restoration, or color.
4. Apply privacy-first engine routing from `../ai-workflows/engine-routing.yaml`.
5. Use non-destructive masks/layers where the selected tool supports them.
6. Export a review preview and final deliverable in the requested format.
7. Record engine/model/version, parameters, and validation results in a job manifest.

## Quality checklist

- Subject identity and requested features preserved.
- Skin texture and fine details remain plausible.
- Hair, fingers, clothing edges, and object boundaries checked.
- Perspective, scale, light direction, shadows, reflections, and depth match for composites.
- No unintended text/logo changes.
- Crop, dimensions, color profile, and alpha behavior match the brief.
- Original source remains unchanged.

## Privacy

Do not send source media to a cloud engine unless the user explicitly approves that specific job. No cloud fallback without consent.
