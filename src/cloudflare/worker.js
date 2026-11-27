/**
 * ZERO Cloudflare read-only control-plane Worker.
 * Public endpoints expose only non-sensitive capability status.
 * Inference, media upload, queues, storage, and paid bindings stay disabled.
 */
const SERVICE = "zero-creative-studio";
const STATUS = Object.freeze({
  project: "ZERO Creative Studio",
  mode: "rp0",
  service: SERVICE,
  cloud_inference_enabled: false,
  private_inference_enabled: false,
  media_upload_enabled: false,
  note: "Read-only control API; no inference worker is connected."
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/healthz") {
      return json({ status: "ok", service: SERVICE });
    }
    if (url.pathname === "/api/status") {
      return json(STATUS);
    }
    return json({ error: "not_found" }, 404);
  }
};
