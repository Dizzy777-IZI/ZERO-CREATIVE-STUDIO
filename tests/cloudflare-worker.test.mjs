import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/cloudflare/worker.js", import.meta.url), "utf8");
const moduleSource = source.replace(/\bexport default\s+/, "globalThis.__worker = ");
assert.notEqual(moduleSource, source, "Cloudflare Worker default export exists");
assert.doesNotThrow(() => new Script(moduleSource), "Cloudflare Worker entrypoint parses");

const sandbox = { URL, Response };
runInNewContext(moduleSource, sandbox);
const worker = sandbox.__worker;

const assets = {
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/" || path === "/index.html" || path === "/editor.html") {
      return new Response("static:" + path, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" }
      });
    }
    return new Response("Not Found", { status: 404 });
  }
};

test("GET /healthz returns the configured Worker service name", async () => {
  const response = await worker.fetch(new Request("https://zero.test/healthz"), { ASSETS: assets });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", service: "zero-creative-studio" });
});

test("GET /api/status reports fail-closed Rp0 capabilities", async () => {
  const response = await worker.fetch(new Request("https://zero.test/api/status"), { ASSETS: assets });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.service, "zero-creative-studio");
  assert.equal(body.mode, "rp0");
  assert.equal(body.cloud_inference_enabled, false);
  assert.equal(body.private_inference_enabled, false);
  assert.equal(body.media_upload_enabled, false);
});

test("static dashboard and photo editor requests are served by the asset binding", async () => {
  const home = await worker.fetch(new Request("https://zero.test/"), { ASSETS: assets });
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.equal(await home.text(), "static:/");

  const editor = await worker.fetch(new Request("https://zero.test/editor.html"), { ASSETS: assets });
  assert.equal(editor.status, 200);
  assert.equal(await editor.text(), "static:/editor.html");
});

test("non-GET/HEAD requests are rejected and unknown routes return JSON 404", async () => {
  const methodResponse = await worker.fetch(new Request("https://zero.test/healthz", { method: "POST" }), { ASSETS: assets });
  assert.equal(methodResponse.status, 405);
  assert.deepEqual(await methodResponse.json(), { error: "method_not_allowed" });

  const routeResponse = await worker.fetch(new Request("https://zero.test/not-found"), { ASSETS: assets });
  assert.equal(routeResponse.status, 404);
  assert.match(routeResponse.headers.get("content-type"), /application\/json/);
  assert.deepEqual(await routeResponse.json(), { error: "not_found" });
});
