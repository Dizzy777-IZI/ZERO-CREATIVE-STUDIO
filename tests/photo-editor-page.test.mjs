import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { createHash } from "node:crypto";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");
const wrangler = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
const securityHeaders = await readFile(new URL("../web/cloudflare/_headers", import.meta.url), "utf8");
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
    "brightness", "contrast", "saturation", "warmth", "sharpness", "sharpen",
    "highlights", "shadows", "tint", "maskMode", "brushSize", "maskOverlay",
    "applyMask", "restoreMask", "clearMask", "invertMask", "maskFeather",
    "highlights", "shadows", "tint",
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

test("browser self-test mode covers local load, adjustments, transforms, sharpen history, crop and PNG export", () => {
  assert.match(script, /function runEditorSelfTest\(\)/);
  for (const check of [
    "Synthetic PNG created", "Local image loaded", "Preview visible and contains pixels",
    "Brightness render keeps preview visible", "Contrast render keeps preview visible",
    "Look preset render keeps preview visible", "Rotate keeps preview visible",
    "Flip keeps preview visible", "Undo restores transform state",
    "Redo reapplies transform state", "Crop ratio applies and remains selected",
    "Undo restores crop selection", "Redo restores crop selection",
    "PNG export produces a non-empty image", "Sharpen changes edge detail in preview",
    "Undo restores the previous sharpen amount", "Redo restores the sharpen amount",
    "Highlights grading changes brighter tones", "Shadows grading changes darker tones",
    "Tint grading shifts image color", "Undo restores previous tint setting", "Redo reapplies tint setting",
    "Manual brush creates a local subject mask", "Remove background applies transparency outside the selection",
    "Undo restores the un-applied manual mask", "Redo reapplies transparent background masking",
    "Changing framing clears an incompatible mask",
    "Invert selection reverses transparent and protected areas",
    "Invert selection can be toggled back", "Edge feather is applied to the effective selection"
  ]) assert.ok(script.includes(check), "missing self-test check: " + check);
  assert.match(script, /new URLSearchParams\(location\.search\)\.get\("selftest"\)==="1"/);
});

test("range sliders suppress blue pointer-focus outlines and use subtle ZERO-green keyboard focus", () => {
  assert.match(html, /input\[type=range\]:focus,input\[type=range\]:focus-visible\{outline:none;box-shadow:none\}/);
  assert.match(html, /input\[type=range\]:focus-visible::-webkit-slider-thumb\{box-shadow:0 0 0 4px rgba\(169,243,108,\.2\)\}/);
  assert.match(html, /input\[type=range\]:focus-visible::-moz-range-thumb\{box-shadow:0 0 0 4px rgba\(169,243,108,\.2\)\}/);
  assert.match(html, /input:not\(\[type=range\]\):focus-visible,select:focus-visible,button:focus-visible\{outline:2px solid var\(--accent\)/);
  assert.doesNotMatch(html, /input:focus,select:focus,button:focus-visible\{outline:2px solid var\(--blue\)/);
});

test("image decode falls back to HTMLImageElement when createImageBitmap rejects", () => {
  assert.match(script, /try\{full=await createImageBitmap\(f\);\}catch\{full=null;\}/);
  assert.match(script, /if\(full\)\{/);
  assert.match(script, /try\{\s*const bitmap=await createImageBitmap\(file\);\s*return \{source:bitmap,cleanup:\(\)=>bitmap\.close\(\)\};\s*\}catch\{\}/);
  assert.match(script, /const url=URL\.createObjectURL\(file\),img=new Image\(\)/);
  assert.ok(script.includes("HTMLImageElement fallback loads the local photo"));
  assert.ok(script.includes("HTMLImageElement fallback decodes the export source"));
});

test("fixed-ratio crop can be repositioned by dragging the canvas and persists in history", () => {
  for (const feature of [
    "cropPanX,cropPanY", "function clamp01(value)", "function syncCropInteraction()",
    "function cropDeltaFromPointer", "canvas.addEventListener(\"pointerdown\"",
    "canvas.addEventListener(\"pointermove\"", "canvas.addEventListener(\"pointerup\"",
    "Dragging canvas repositions the crop framing", "Undo restores previous crop framing",
    "Redo reapplies crop framing", "geser foto langsung di canvas"
  ]) assert.ok(script.includes(feature), "missing crop interaction feature: " + feature);
  assert.match(script, /return\{x:maxX\*cropPanX,y:0,w:nw,h,maxX,maxY:0\}/);
  assert.match(script, /return\{x:0,y:maxY\*cropPanY,w,h:nh,maxX:0,maxY\}/);
});

test("crop mode displays a proportional composition guide over the canvas", () => {
  assert.match(html, /<div class="crop-frame" id="cropFrame" hidden aria-hidden="true"><\/div>/);
  assert.match(html, /\.crop-frame\{position:absolute;z-index:2;pointer-events:none/);
  assert.match(html, /\.crop-frame\[hidden\]\{display:none\}/);
  assert.ok(script.includes('const frame=$("cropFrame")'));
  assert.ok(script.includes('Crop frame guide appears while crop mode is active'));
  assert.ok(script.includes('Crop frame guide hides when crop is reset'));
});

test("static assets receive a strict CSP and browser privacy protections", () => {
  const policy = securityHeaders.match(/Content-Security-Policy:\s*([^\n]+)/)?.[1];
  assert.ok(policy, "Cloudflare _headers defines a Content-Security-Policy");
  const scriptHash = createHash("sha256").update(script, "utf8").digest("base64");
  assert.ok(policy.includes("'sha256-" + scriptHash + "'"), "CSP hash must match the exact inline editor script");
  const scriptDirective = policy.match(/(?:^|;\s*)script-src\s+([^;]+)/)?.[1] || "";
  assert.match(scriptDirective, /'self'/);
  assert.doesNotMatch(scriptDirective, /unsafe-inline|unsafe-eval/);
  assert.match(policy, /img-src[^;]*blob:/);
  assert.match(policy, /media-src[^;]*blob:/);
  assert.match(policy, /connect-src 'self'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /frame-ancestors 'none'/);
  for (const header of [
    "X-Content-Type-Options: nosniff", "X-Frame-Options: DENY",
    "Referrer-Policy: no-referrer", "Cross-Origin-Opener-Policy: same-origin",
    "Cross-Origin-Resource-Policy: same-origin", "X-Robots-Tag: noindex, nofollow"
  ]) assert.ok(securityHeaders.includes(header), "missing browser security header: " + header);
  assert.match(securityHeaders, /Permissions-Policy: camera=\(\), microphone=\(\), geolocation=\(\)/);
});

test("photo editor protects unsaved work and provides a lightweight vignette retouch control", () => {
  assert.match(html, /automatic session recovery is not enabled yet/i);
  assert.match(script, /function hasUnsavedChanges\(\)/);
  assert.match(script, /window\.confirm\("Ada perubahan yang belum diekspor/);
  assert.match(script, /window\.addEventListener\("beforeunload",e=>\{\s*if\(hasUnsavedChanges\(\)\)/);
  assert.match(script, /window\.addEventListener\("pagehide",e=>\{/);
  assert.match(script, /if\(!e\.persisted&&previewImage&&typeof previewImage\.close==="function"\)/);
  assert.match(script, /function drawVignette\(target,w,h,original=false\)/);
  assert.ok(html.includes('id="vignette"'));
  assert.ok(script.includes("Vignette darkens the image edges"));
  assert.ok(script.includes("Unsaved edits trigger a leave-page warning"));
  assert.ok(script.includes("Replacing an edited photo requires confirmation"));
  assert.ok(script.includes("Successful export clears the unsaved-work warning"));
});


test("sharpen uses bounded row-band buffers and is shared by preview and export", () => {
  assert.match(script, /function drawSharpen\(target,w,h,original=false\)/);
  assert.match(script, /const strength=amount\*1\.25,bandHeight=128/);
  assert.match(script, /getImageData\(0,readTop,w,Math\.min\(h,top\+rows\+1\)-readTop\)/);
  assert.match(script, /context\.createImageData\(w,rows\)/);
  assert.match(script, /savedRow=rawData\.slice\(finalRow,finalRow\+w\*4\)/);
  assert.ok(script.includes("drawSharpen(ctx,w,h,original)"), "preview must use sharpen engine");
  assert.ok(script.includes("drawSharpen(c,w,h,original)"), "full-resolution export must use sharpen engine");
  assert.ok(script.includes("context.putImageData(output,0,top)"));
});


test("color grading controls are included in the state and shared row-buffer pixel engine", () => {
  for (const control of ["highlights", "shadows", "tint"]) {
    assert.match(html, new RegExp('id="' + control + '"'));
    assert.match(script, new RegExp('"' + control + '"'));
  }
  assert.match(html, /label for="warmth">Temperature/);
  assert.match(script, /highlights:0,shadows:0,tint:0/);
  assert.match(script, /function drawSharpen\(target,w,h,original=false\)/);
  assert.match(script, /const highlightMask=smoothstep\(0\.28,0\.88,luminance\)/);
  assert.match(script, /const shadowMask=1-smoothstep\(0\.12,0\.62,luminance\)/);
  assert.match(script, /const tintShift=tint\*20/);
  assert.ok(script.includes("drawSharpen(ctx,w,h,original)"), "preview applies grading");
  assert.ok(script.includes("drawSharpen(c,w,h,original)"), "export applies grading");
  assert.match(script, /\["warmth","highlights","shadows","tint"\]\.includes\(k\)/);
});


test("manual background masking paints reversible vector strokes and exports true transparency", () => {
  for (const control of ["maskMode", "brushSize", "maskOverlay", "maskFeather", "invertMask", "applyMask", "restoreMask", "clearMask"]) {
    assert.match(html, new RegExp('id="' + control + '"'));
  }
  assert.match(html, /data-panel="background"/);
  assert.match(script, /const MAX_MASK_STROKES=120,MAX_MASK_POINTS_PER_STROKE=2000/);
  assert.match(script, /function initializeMaskCanvas\(\)/);
  assert.match(script, /function redrawMaskStrokes\(\)/);
  assert.match(script, /function applyMaskToContext\(target,w,h,effectiveMask\)/);
  assert.match(script, /target\.globalCompositeOperation="destination-in"/);
  assert.match(script, /function drawMaskOverlay\(target,w,h,effectiveMask\)/);
  assert.match(script, /function finishMaskPaint\(event\)/);
  assert.match(script, /mode:\(maskInverted\?!requestedErase:requestedErase\)\?"erase":"add"/);
  assert.match(script, /function geometrySignature\(\)/);
  assert.match(script, /clearMaskForGeometryChange\(\)/);
  assert.match(script, /maskStrokes,maskApplied,maskInverted,maskFeather:\+\$\("maskFeather"\)\.value,maskRevision/);
  assert.match(script, /maskStrokes=s\.maskStrokes\|\|\[\];maskApplied=!!s\.maskApplied;maskInverted=!!s\.maskInverted/);
  assert.ok(script.includes("Manual brush creates a local subject mask"));
  assert.ok(script.includes("Remove background applies transparency outside the selection"));
  assert.ok(script.includes("Undo restores the un-applied manual mask"));
  assert.ok(script.includes("Redo reapplies transparent background masking"));
  assert.ok(script.includes("Changing framing clears an incompatible mask"));
});

test("JPEG background is composited behind the mask so transparent pixels remain white", () => {
  assert.match(script, /getContext\("2d",\{alpha:true\}\)/);
  assert.match(script, /if\(!original&&maskStrokes\.length\)\{const effectiveMask=renderEffectiveMask\(w,h\);applyMaskToContext\(c,w,h,effectiveMask\);\}/);
  assert.match(script, /globalCompositeOperation="destination-over";c\.fillStyle=background/);
});


test("background mask supports selection inversion, inverted brush semantics and soft edges", () => {
  assert.match(html, /id="invertMask"/);
  assert.match(html, /id="maskFeather"/);
  assert.match(script, /maskInverted,maskFeather:\+\$\("maskFeather"\)\.value/);
  assert.match(script, /function renderEffectiveMask\(w,h\)/);
  assert.match(script, /effective\.filter=feather>0\?"blur\("\+feather\+"px\)":"none"/);
  assert.match(script, /if\(maskInverted\)\{\s*effective\.fillStyle="#fff";effective\.fillRect\(0,0,w,h\);\s*effective\.globalCompositeOperation="destination-out"/);
  assert.match(script, /mode:\(maskInverted\?!requestedErase:requestedErase\)\?"erase":"add"/);
  assert.match(script, /maskInverted=!maskInverted/);
  assert.match(script, /maskInverted=!!s\.maskInverted/);
  assert.match(script, /\$\("maskFeather"\)\.value=s\.maskFeather\?\?0/);
  assert.ok(script.includes("Invert selection reverses transparent and protected areas"));
  assert.ok(script.includes("Edge feather is applied to the effective selection"));
});

test("inline photo editor script parses without syntax errors", () => {
  assert.ok(script, "inline editor script exists");
  assert.doesNotThrow(() => new Script(script));
});
