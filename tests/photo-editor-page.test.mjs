import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];


test("Cloudflare serves static assets directly and invokes Worker first only for API and health routes", () => {
  assert.ok(wrangler.includes('run_worker_first = ["/healthz", "/api/*"]'));
  assert.doesNotMatch(wrangler, /run_worker_first\s*=\s*true/);
});

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
  assert.match(script, /INTERACTIVE_PREVIEW_MAX_PIXELS\s*=\s*640000/);
  assert.match(script, /INTERACTIVE_PREVIEW_MAX_DIMENSION\s*=\s*1000/);
  assert.match(script, /scheduleRender\(false,true\)/);
  assert.match(script, /scheduleRender\(false,false\)/);
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


test("render status announcements are defined and update the visible status line", () => {
  assert.match(html, /<div class="statusline" id="status" role="status"/);
  const match = script.match(/function announce\(message\)\{([\s\S]*?)\n\}/);
  assert.ok(match, "announce() must be defined before render() uses it");
  const status = { textContent: "" };
  const announce = new Function("$", "return function announce(message) {" + match[1] + "\n}");
  announce(() => status)("Photo rendered");
  assert.equal(status.textContent, "Photo rendered");
});

test("undo and redo synchronize selected Look and Crop controls with restored state", () => {
  const block = script.match(/function syncSelections\(\)\{([\s\S]*?)\n\}/);
  assert.ok(block, "syncSelections() helper must exist");
  const presets = ["original", "cinema", "vivid"].map((preset) => ({
    dataset: { preset }, selected: false,
    classList: { toggle(_name, value) { this.owner.selected = value; }, owner: null }
  }));
  const crops = ["free", "1", "0.8"].map((ratio) => ({
    dataset: { ratio }, selected: false,
    classList: { toggle(_name, value) { this.owner.selected = value; }, owner: null }
  }));
  [...presets, ...crops].forEach((node) => { node.classList.owner = node; });
  const document = { querySelectorAll(selector) { return selector === "[data-preset]" ? presets : crops; } };
  const syncSelections = new Function("document", "look", "cropRatio", "return function syncSelections() {" + block[1] + "\n}")(document, "cinema", 0.8);
  syncSelections();
  assert.deepEqual(presets.map((x) => x.selected), [false, true, false]);
  assert.deepEqual(crops.map((x) => x.selected), [false, false, true]);
});

test("browser self-test mode covers local load, adjustments, transforms, history, crop and PNG export", () => {
  assert.match(script, /function runEditorSelfTest\(\)/);
  for (const check of [
    "Synthetic PNG created", "Local image loaded", "Preview visible and contains pixels",
    "Brightness render keeps preview visible", "Contrast render keeps preview visible",
    "Look preset render keeps preview visible", "Rotate keeps preview visible",
    "Flip keeps preview visible", "Undo restores transform state",
    "Redo reapplies transform state", "Crop ratio applies and remains selected",
    "Undo restores crop selection", "Redo restores crop selection",
    "PNG export produces a non-empty image"
  ]) assert.ok(script.includes(check), "missing self-test check: " + check);
  assert.match(script, /new URLSearchParams\(location\.search\)\.get\("selftest"\)==="1"/);
});

test("inline photo editor script parses without syntax errors", () => {
  assert.ok(script, "inline editor script exists");
  assert.doesNotThrow(() => new Script(script));
});
