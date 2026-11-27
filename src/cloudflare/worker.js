/**
 * ZERO Cloudflare control-plane starter.
 * Public endpoints expose only non-sensitive runtime capability status.
 * No media upload, inference, queue, storage, or paid-service binding exists.
 */
const STATUS = Object.freeze({
  project: "ZERO Creative Studio",
  mode: "rp0",
  service: "read-only-control-api",
  cloud_inference_enabled: false,
  private_inference_enabled: false,
  media_upload_enabled: false,
  note: "Control-plane API only; no inference worker is connected."
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
      return json({ status: "ok", service: "zero-control-api" });
    }
    if (url.pathname === "/api/status") {
      return json(STATUS);
    }
    return json({ error: "not_found" }, 404);
  }
};
