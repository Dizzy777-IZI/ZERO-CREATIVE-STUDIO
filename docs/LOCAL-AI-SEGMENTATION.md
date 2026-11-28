# ZERO Local AI Person Segmentation

## What it does

The Background panel can run **Detect person locally**. It uses the MediaPipe Image Segmenter task with Google's Selfie Segmenter model to produce an initial person/background confidence mask. The result is placed underneath the existing manual brush layer, so Add, Erase, Restore, Invert, Edge Feather, Undo, Redo, and transparent export continue to work.

The Selfie Segmenter output has two confidence classes: **background (index 0)** and **person (index 1)**. ZERO explicitly selects the person confidence map as the editable foreground mask; it does not mistake the background class for the subject.

This v1 model is specifically trained for people and portrait-style images. It is not a general object-removal model and should not be presented as detecting pets, vehicles, products, furniture, or arbitrary foreground objects.

## Privacy and network boundary

- The user must press **Detect person locally** before the AI runtime or model is requested.
- The browser starts the same-origin `/ai/segmenter.worker.js` module worker.
- The selected image is rendered to a capped preview canvas and transferred to that same-origin worker using `ImageBitmap`.
- The worker performs inference locally with MediaPipe Tasks Vision using the CPU delegate.
- The only cross-origin downloads in this path are the pinned MediaPipe JS/WASM runtime and the pinned model file. Requests use GET, omit credentials, and send no photo bytes.
- The downloaded model is rejected unless its byte length and SHA-256 match the pinned values below.
- Manual selection continues to work if the CDN, model download, WASM runtime, or AI initialization fails.

## Pinned dependencies and provenance

| Asset | Pinned source | Size / integrity |
|---|---|---|
| MediaPipe Tasks Vision JS | `@mediapipe/tasks-vision@1.2.3` via jsDelivr | Version-pinned; loaded only on user action |
| MediaPipe Tasks Vision WASM | Same package version, `/wasm` directory | Version-pinned; loaded only on user action |
| Selfie Segmenter model | Google MediaPipe model bucket, version `/1/` | 249,537 bytes |
| Model SHA-256 | `191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b` | Verified before task initialization |

Model URL:
`https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite`

Model source and metadata identify it as a 256 × 256 FP16 selfie/person segmentation model. The model is distributed under Apache License 2.0. MediaPipe Tasks Vision is also Apache License 2.0.

## Performance and memory

- The model itself is approximately 250 KB; the runtime and WASM are additional on-demand downloads.
- Inference is isolated in a dedicated worker to avoid running the model synchronously on the editor's UI thread.
- The inference input uses the editor's capped preview dimensions, not the original full-resolution file.
- The worker transfers a one-byte-per-pixel confidence map back to the editor.
- The editor stores the AI confidence map as a compact byte array and composites it with the manual vector brush layer.
- The model is cached in the worker for the current editor page. It is not loaded for users who never request AI detection.

## Operational notes

The security policy intentionally permits only the pinned runtime host and Google model host for this feature. Do not add broad remote origins, cloud inference endpoints, image uploads, analytics, or telemetry to this path without a separate privacy and security review.

The AI result is a starting selection, not a guaranteed perfect cutout. Refine hair, transparent objects, overlapping subjects, and difficult edges with the existing manual tools.