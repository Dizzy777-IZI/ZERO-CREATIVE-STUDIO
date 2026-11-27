import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const source = readFileSync(new URL("../src/cloudflare/worker.js", import.meta.url), "utf8");
const moduleSource = source.replace(/\\bexport default\\s+/, "globalThis.__worker = ");
assert.notEqual(moduleSource, source, "Cloudflare Worker default export exists");
assert.doesNotThrow(() => new Script(moduleSource), "Cloudflare Worker entrypoint parses");

const sandbox = { URL, Response };
runInNewContext(moduleSource, sandbox);
const worker = sandbox.__worker;

test("GET /healthz returns the configured Worker service name", async () => {
  const response = await worker.fetch(new Request("https://zero.test/healthz"));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\\/json/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ok", service: "zero-creative-studio" });
});

test("GET /api/status reports fail-closed Rp0 capabilities", async () => {
  const response = await worker.fetch(new Request("https://zero.test/api/status"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.service, "zero-creative-studio");
  assert.equal(body.mode, "rp0");
  assert.equal(body.cloud_inference_enabled, false);
  assert.equal(body.private_inference_enabled, false);
  assert.equal(body.media_upload_enabled, false);
});

test("non-GET requests are rejected and unknown routes return 404", async () => {
  const methodResponse = await worker.fetch(new Request("https://zero.test/healthz", { method: "POST" }));
  assert.equal(methodResponse.status, 405);
  assert.deepEqual(await methodResponse.json(), { error: "method_not_allowed" });

  const routeResponse = await worker.fetch(new Request("https://zero.test/not-found"));
  assert.equal(routeResponse.status, 404);
  assert.deepEqual(await routeResponse.json(), { error: "not_found" });
});
