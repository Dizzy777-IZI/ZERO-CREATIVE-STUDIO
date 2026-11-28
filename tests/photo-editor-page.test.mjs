import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("photo editor accepts local formats with explicit source-file limits", () => {
  assert.match(html, /input\.type\s*=\s*"file"/);
  assert.match(html, /image\/jpeg,image\/png,image\/webp,image\/avif/);
  assert.match(script, /MAX_BYTES\s*=\s*30\s*\*\s*1024\s*\*\s*1024/);
  assert.match(script, /MAX_INPUT_PIXELS\s*=\s*24000000/);
  assert.match(script, /createImageBitmap\(f\)/);
  assert.match(script, /URL\.createObjectURL\(f\)/);
  assert.match(script, /URL\.revokeObjectURL/);
});

test("photo editor provides adjustments, creative looks, transforms, history and export", () => {
  for (const control of [
    "brightness", "contrast", "saturation", "warmth", "sharpness",
    "rotateLeft", "rotateRight", "flipH", "flipV", "applySize",
    "undo", "redo", "download", "format", "quality"
  ]) {
    assert.match(html, new RegExp('id="' + control + '"'));
  }
  for (const feature of [
    "cinema", "vivid", "mono", "warm", "soft", "cropRect",
    "pushHistory", "drawTo", "decodeOriginalForExport", "exportCanvas.toBlob"
  ]) {
    assert.ok(script.includes(feature), "missing feature: " + feature);
  }
});

test("preview rendering and full-resolution export have hard memory bounds", () => {
  assert.match(script, /MAX_OUTPUT_DIMENSION\s*=\s*6000/);
  assert.match(script, /MAX_OUTPUT_PIXELS\s*=\s*24000000/);
  assert.match(script, /PREVIEW_MAX_DIMENSION\s*=\s*1400/);
  assert.match(script, /PREVIEW_MAX_PIXELS\s*=\s*1600000/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /resizeWidth/);
  assert.match(script, /PREVIEW_MAX_PIXELS/);
  assert.match(script, /decoded\.cleanup\(\)/);
  assert.match(script, /exportCanvas\.width=0;exportCanvas\.height=0/);
});

test("full-resolution source is decoded only for export and stays local", () => {
  assert.match(script, /const bitmap=await createImageBitmap\(file\)/);
  assert.match(script, /bitmap\.close\(\)/);
  assert.match(script, /previewImage=preview/);
  assert.match(script, /sourceWidth=width;sourceHeight=height/);
  assert.match(script, /type==="image\/jpeg"\?"#ffffff":null/);
  assert.doesNotMatch(html, /\bfetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /WebSocket/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /Your photos are never uploaded/i);
});

test("inline photo editor script parses without syntax errors", () => {
  assert.ok(script, "inline editor script exists");
  assert.doesNotThrow(() => new Script(script));
});
