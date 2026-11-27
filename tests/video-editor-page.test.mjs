import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";

const html = readFileSync(new URL("../web/cloudflare/video-editor.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

test("video editor keeps media local and enforces input size", () => {
  assert.match(html, /diproses langsung di browser/i);
  assert.match(html, /200\s*\*\s*1024\s*\*\s*1024/);
  assert.match(html, /URL\.createObjectURL/);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|https?:\/\//i);
});

test("video editor trim sliders preserve decimal steps and export controls exist", () => {
  assert.match(html, /id="start" type="range" min="0" max="1" step="0\.1"/);
  assert.match(html, /id="end" type="range" min="0" max="1" step="0\.1"/);
  for (const id of ["videoFile", "preview", "start", "end", "previewClip", "reset", "export"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /MediaRecorder/);
  assert.match(html, /zero-video-clip\.webm/);
});

test("video editor JavaScript parses", () => {
  assert.ok(script, "inline editor script exists");
  assert.doesNotThrow(() => new Script(script));
});

test("seek listener handles no-op, timeout and failed seek", () => {
  assert.match(script, /function waitForSeek\(target\)/);
  assert.match(script, /Math\.abs\(video\.currentTime-target\)<0\.02/);
  assert.ok(script.indexOf('video.addEventListener("seeked",onSeeked') < script.indexOf("video.currentTime=target"));
  assert.match(script, /Seek timeout/);
  assert.match(script, /Video gagal melakukan seek/);
});

test("recorder error does not unlock the editor before recorder stop", () => {
  const errorStart = script.indexOf("recorder.onerror=");
  const stopStart = script.indexOf("recorder.onstop=", errorStart);
  assert.ok(errorStart >= 0 && stopStart > errorStart);
  const errorHandler = script.slice(errorStart, stopStart);
  assert.match(errorHandler, /recorder\.stop\(\)/);
  assert.doesNotMatch(errorHandler, /catch\{\}cleanupExport\(\)/);
  assert.match(script, /let awaitingStop=false;[\s\S]*?if\(!awaitingStop\)cleanupExport\(\)/);
  assert.match(script, /function cleanupExport\(\)/);
  assert.match(script, /activeStream\.getTracks\(\)\.forEach/);
  assert.match(script, /chunks\.some\(chunk=>chunk\.size>0\)/);
  assert.match(script, /if\(!blob\.size\)/);
});

test("WebM duration helper inserts seekable metadata using the stream timecode scale", async () => {
  const match = script.match(/async function addWebmDuration\(blob, durationMs\) \{[\s\S]*?\n\}/);
  assert.ok(match, "WebM duration helper exists");
  const sandbox = { Blob, Uint8Array, DataView, Number, Math };
  runInNewContext(match[0] + "\nglobalThis.addWebmDuration = addWebmDuration;", sandbox);

  // Minimal EBML Segment + Info containing TimecodeScale = 2,000,000 ns.
  const sample = new Blob([Uint8Array.from([
    0x18,0x53,0x80,0x67, 0x01,0xff,0xff,0xff,0xff,0xff,0xff,0xff,
    0x15,0x49,0xa9,0x66, 0x87,
    0x2a,0xd7,0xb1, 0x83, 0x1e,0x84,0x80
  ])], { type: "video/webm" });
  const output = await sandbox.addWebmDuration(sample, 1500);
  const bytes = new Uint8Array(await output.arrayBuffer());
  let durationIndex = -1;
  for (let i = 0; i < bytes.length - 11; i++) {
    if (bytes[i] === 0x44 && bytes[i + 1] === 0x89 && bytes[i + 2] === 0x88) {
      durationIndex = i;
      break;
    }
  }
  assert.ok(durationIndex >= 0, "Duration EBML element was added");
  assert.equal(new DataView(bytes.buffer).getFloat64(durationIndex + 3, false), 750);
  assert.equal(bytes[16], 0x92, "Info size was increased to include Duration");
});

test("WebM helper leaves unrecognized blobs unchanged", async () => {
  const match = script.match(/async function addWebmDuration\(blob, durationMs\) \{[\s\S]*?\n\}/);
  const sandbox = { Blob, Uint8Array, DataView, Number, Math };
  runInNewContext(match[0] + "\nglobalThis.addWebmDuration = addWebmDuration;", sandbox);
  const source = new Blob([Uint8Array.from([1,2,3,4])], { type: "video/webm" });
  const output = await sandbox.addWebmDuration(source, 1200);
  assert.equal(output, source);
});

test("export cleanup revokes the recording stream and does not claim empty output succeeded", () => {
  assert.match(script, /activeStream=null/);
  assert.match(script, /track\.stop\(\)/);
  assert.match(script, /Ekspor gagal: browser tidak menghasilkan data video/);
  assert.match(script, /Ekspor selesai\. Durasi dan seek WebM sudah diperbarui/);
});
