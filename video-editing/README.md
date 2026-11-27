# Video Editing Pipeline

Status: workflow specification; no executable rendering pipeline is connected yet.

## Pipeline

1. Probe source files: container, codec, resolution, frame rate, duration, audio streams, and rotation metadata.
2. Preserve originals and create an edit manifest.
3. Define selects, timeline, aspect ratio, captions, audio, transitions, color, and export profile.
4. Route AI operations using `../ai-workflows/engine-routing.yaml`; conventional timeline rendering should remain deterministic.
5. Render to a temporary output, then validate before publishing the final file.
6. Keep project files, review exports, and final exports separate.

## Quality checklist

- Correct dimensions, frame rate, codec, and duration.
- No black/frozen frames, unintended crop, or orientation error.
- No flicker or abrupt color shifts.
- Captions are accurate, timed, legible, and inside platform-safe areas.
- Dialogue is intelligible; music/effects do not clip.
- Audio and video remain synchronized.
- Final file decodes and plays through to completion.

## Privacy

Do not upload footage or audio to a cloud engine without explicit per-job consent. Private inference and rendering are planned for a separately managed worker, not the owner's PC.
