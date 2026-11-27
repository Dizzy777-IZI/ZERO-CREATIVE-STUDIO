import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("../src/cloudflare/worker.js", import.meta.url), "utf8");
const encoded = Buffer.from(source).toString("base64");
const { default: worker } = await import(`data:text/javascript;base64,${encoded}`);

async function call(path, method = "GET") {
  return worker.fetch(new Request(`https://zero.test${path}`, { method }));
}

test("health endpoint returns the configured service identity", async () => {
  const response = await call("/healthz");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "zero-creative-studio"
  });
});

test("status endpoint keeps all processing capabilities disabled", async () => {
  const response = await call("/api/status");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.service, "zero-creative-studio");
  assert.equal(body.cloud_inference_enabled, false);
  assert.equal(body.private_inference_enabled, false);
  assert.equal(body.media_upload_enabled, false);
});

test("non-GET methods are rejected", async () => {
  const response = await call("/api/status", "POST");
  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), { error: "method_not_allowed" });
});

test("unknown paths are rejected", async () => {
  const response = await call("/not-found");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});
