/* ZERO Local Person Segmentation Worker
 * MediaPipe Tasks Vision (Apache-2.0) + Google MediaPipe Selfie Segmenter model (Apache-2.0).
 * Images are transferred from this page to this same-origin worker only. No image bytes are fetched or uploaded.
 */
const RUNTIME_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/vision_bundle.mjs";
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";
const MODEL_BYTES = 249537;
const MODEL_SHA256 = "191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b";
const MAX_MODEL_BYTES = 1024 * 1024;

let segmenter = null;
let segmenterPromise = null;

function postStatus(id, message) {
  self.postMessage({ type: "STATUS", id, message });
}

async function loadSegmenter(id) {
  postStatus(id, "Loading local AI runtime…");
  const { FilesetResolver, ImageSegmenter } = await import(RUNTIME_URL);

  postStatus(id, "Preparing on-device inference engine…");
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  postStatus(id, "Downloading verified 250 KB person model…");
  const response = await fetch(MODEL_URL, {
    method: "GET",
    mode: "cors",
    credentials: "omit",
    cache: "force-cache",
    referrerPolicy: "no-referrer"
  });
  if (!response.ok) {
    throw new Error("Model download failed (HTTP " + response.status + ").");
  }

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > MAX_MODEL_BYTES) {
    throw new Error("Model response exceeded the 1 MB safety limit.");
  }

  const modelBuffer = await response.arrayBuffer();
  if (modelBuffer.byteLength !== MODEL_BYTES || modelBuffer.byteLength > MAX_MODEL_BYTES) {
    throw new Error("Downloaded model has an unexpected size. The file was rejected.");
  }

  postStatus(id, "Verifying model integrity…");
  if (!self.crypto?.subtle) {
    throw new Error("Secure model verification is unavailable in this browser context.");
  }
  const digest = await self.crypto.subtle.digest("SHA-256", modelBuffer);
  const actualHash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  if (actualHash !== MODEL_SHA256) {
    throw new Error("Model integrity check failed. The downloaded file was rejected.");
  }

  postStatus(id, "Initializing local person segmentation…");
  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer: new Uint8Array(modelBuffer),
      delegate: "CPU"
    },
    runningMode: "IMAGE",
    outputCategoryMask: false,
    outputConfidenceMasks: true
  });
  return segmenter;
}

async function getSegmenter(id) {
  if (segmenter) return segmenter;
  if (!segmenterPromise) {
    segmenterPromise = loadSegmenter(id).catch(error => {
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
    const engine = await getSegmenter(id);
    postStatus(id, "Detecting person locally on this device…");
    const result = engine.segment(bitmap);
    masks = result?.confidenceMasks || [];
    if (!masks.length || !masks[0]) {
      throw new Error("The person model did not return a confidence mask for this image.");
    }

    const mask = masks[0];
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
    self.postMessage({ type: "RESULT", id, photoSequence, width, height, confidence: buffer }, [buffer]);
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
