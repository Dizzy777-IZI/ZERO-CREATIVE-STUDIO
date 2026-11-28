import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");

test("photo editor accepts supported local image formats with resource limits", () => {
  assert.match(html, /input\.type\s*=\s*"file"/);
  assert.match(html, /image\/jpeg,image\/png,image\/webp,image\/avif/);
  assert.match(html, /MAX_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/);
  assert.match(html, /MAX_PIXELS\s*=\s*40000000/);
  assert.match(html, /URL\.createObjectURL\(f\)/);
  assert.match(html, /URL\.revokeObjectURL/);
});

test("photo editor provides adjustments, looks, transforms, history and export", () => {
  for (const control of [
    "brightness", "contrast", "saturation", "warmth", "sharpness",
    "rotateLeft", "rotateRight", "flipH", "flipV", "applySize",
    "undo", "redo", "download", "format", "quality"
  ]) {
    assert.match(html, new RegExp('id="' + control + '"'));
  }
  for (const feature of ["cinema", "vivid", "mono", "warm", "soft", "cropRect", "pushHistory", "canvas.toBlob"]) {
    assert.ok(html.includes(feature), "missing feature: " + feature);
  }
  assert.match(html, /MAX_OUTPUT\s*=\s*8000/);
  assert.match(html, /40\s*MP/);
});

test("photo editor keeps image processing local and has no network upload path", () => {
  assert.doesNotMatch(html, /\bfetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /WebSocket/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /Local processing/i);
  assert.match(html, /Your original stays on this device/i);
  assert.match(html, /canvas\.toBlob/);
});
