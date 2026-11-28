/**
 * ZERO Cloudflare Worker: read-only control API plus local-first static UI.
 * Media stays in the browser. No upload, inference, queue, or storage binding exists.
 */
const SERVICE = "zero-creative-studio";
const STATUS = Object.freeze({
  project: "ZERO Creative Studio",
  service: SERVICE,
  mode: "rp0",
  deployment: "preview",
  cloud_inference_enabled: false,
  private_inference_enabled: false,
  media_upload_enabled: false,
  note: "Local-first UI and control API only; no inference worker is connected."
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
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/healthz") {
      return json({ status: "ok", service: SERVICE });
    }
    if (url.pathname === "/api/status") {
      return json(STATUS);
    }
    if (env?.ASSETS && typeof env.ASSETS.fetch === "function") {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        return json({ error: "not_found" }, 404);
      }
      return assetResponse;
    }
    return json({ error: "not_found" }, 404);
  }
};
