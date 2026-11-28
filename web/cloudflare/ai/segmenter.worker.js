/* ZERO Local Person Segmentation Worker
 * MediaPipe Tasks Vision (Apache-2.0) + Google MediaPipe Selfie Segmenter model (Apache-2.0).
 * Images are transferred from this same-origin page to this same-origin worker only. No image bytes are fetched or uploaded.
 */
const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";
const MODEL_BYTES = 249537;
const MODEL_SHA256 = "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b";
const MAX_MODEL_BYTES = 1024 * 1024;

let segmenter = null;
let segmenterPromise = null;

function postStatus(id, photoSequence, message) {
  self.postMessage({ type: "STATUS", id, photoSequence, message });
}

async function loadSegmenter(id, photoSequence) {
  postStatus(id, photoSequence, "Loading local AI runtime…");
  const { FilesetResolver, ImageSegmenter } = await import(RUNTIME_URL);

  postStatus(id, photoSequence, "Preparing on-device inference engine…");
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  postStatus(id, photoSequence, "Downloading verified 250 KB person model…");
  const response = await fetch(MODEL_URL, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
    referrerPolicy: "no-referrer"
  });
  if (!response.ok) throw new Error("Model download failed (HTTP " + response.status + ").");

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_MODEL_BYTES) throw new Error("Model response exceeded the 1 MB safety limit.");

  // Enforce the cap while streaming; checking arrayBuffer() afterward would
  // still allow an unexpectedly large response to allocate memory first.
  if (!response.body?.getReader) throw new Error("Streaming model download is not supported in this browser.");
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_MODEL_BYTES || receivedBytes > MODEL_BYTES) {
        await reader.cancel();
        throw new Error("Model response exceeded the verified size limit. The download was stopped.");
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }

  if (receivedBytes !== MODEL_BYTES) throw new Error("Downloaded model has an unexpected size. The file was rejected.");
  const modelBytes = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    modelBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  chunks.length = 0;
  const modelBuffer = modelBytes.buffer;

  postStatus(id, photoSequence, "Verifying model integrity…");
  if (!self.crypto?.subtle) throw new Error("Secure model verification is unavailable in this browser context.");
  const digest = await self.crypto.subtle.digest("SHA-256", modelBuffer);
  const actualHash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  if (actualHash !== MODEL_SHA256) throw new Error("Model integrity check failed. The downloaded file was rejected.");

  postStatus(id, photoSequence, "Initializing local person segmentation…");
  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: { modelAssetBuffer: modelBytes, delegate: "CPU" },
    runningMode: "IMAGE",
    outputCategoryMask: false,
    outputConfidenceMasks: true
  });
  return segmenter;
}

async function getSegmenter(id, photoSequence) {
  if (segmenter) return segmenter;
  if (!segmenterPromise) {
    segmenterPromise = loadSegmenter(id, photoSequence).catch(error => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

self.addEventListener("message", async event => {
  const message = event.data || {};
  if (message.type === "DISPOSE") {
    if (segmenter) {
      try { segmenter.close(); } catch {}
      segmenter = null;
      segmenterPromise = null;
    }
    return;
  }
  if (message.type !== "SEGMENT_IMAGE") return;

  const { id, bitmap, photoSequence } = message;
  if (!bitmap) {
    self.postMessage({ type: "ERROR", id, photoSequence, message: "No image frame was provided to the local worker." });
    return;
  }

  let masks = [];
  try {
    const engine = await getSegmenter(id, photoSequence);
    postStatus(id, photoSequence, "Detecting person locally on this device…");
    const result = engine.segment(bitmap);
    masks = result?.confidenceMasks || [];
    // Selfie Segmenter class order is background (0), person (1).
    // Prefer the explicit person confidence map; fall back only if a model
    // packaging variant returns a single foreground confidence map.
    const personClassIndex = masks.length > 1 ? 1 : 0;
    const mask = masks[personClassIndex];
    if (!mask) throw new Error("The person model did not return a person confidence mask for this image.");
    const width = Number(mask.width);
    const height = Number(mask.height);
    const values = mask.getAsFloat32Array();
    if (!width || !height || width * height !== values.length || values.length > 256 * 256) {
      throw new Error("The local model returned an invalid mask shape.");
    }

    // Quantize to one byte per pixel before transferring the mask to the editor.
    const confidence = new Uint8Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const value = Number.isFinite(values[i]) ? Math.max(0, Math.min(1, values[i])) : 0;
      confidence[i] = Math.round(value * 255);
    }
    const buffer = confidence.buffer;
    self.postMessage({ type: "RESULT", id, photoSequence, width, height, classIndex: personClassIndex, confidence: buffer }, [buffer]);
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      id,
      photoSequence,
      message: error instanceof Error ? error.message : "Local segmentation failed."
    });
  } finally {
    for (const mask of masks) {
      try { mask.close(); } catch {}
    }
    try { bitmap.close(); } catch {}
  }
});
