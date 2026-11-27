import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../web/cloudflare/video-editor.html", import.meta.url), "utf8");

test("video editor keeps media local and enforces input size", () => {
  assert.match(html, /diproses langsung di browser/i);
  assert.match(html, /200\s*\*\s*1024\s*\*\s*1024/);
  assert.match(html, /URL\.createObjectURL/);
});

test("video editor provides trim preview and WebM export", () => {
  for (const id of ["start", "end", "previewClip", "export"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /MediaRecorder/);
  assert.match(html, /zero-video-clip\.webm/);
});

test("seek listener is installed before changing currentTime and handles no-op seeks", () => {
  assert.match(html, /function waitForSeek\(target\)/);
  assert.match(html, /Math\.abs\(video\.currentTime-target\)<0\.02/);
  assert.ok(html.indexOf('video.addEventListener("seeked",onSeeked') < html.indexOf("video.currentTime=target"));
});

test("recorder failures clean up tracks and never download an empty output", () => {
  assert.match(html, /function cleanupExport\(\)/);
  assert.match(html, /activeStream\.getTracks\(\)\.forEach/);
  assert.match(html, /chunks\.some\(chunk=>chunk\.size>0\)/);
  assert.match(html, /if\(!blob\.size\)/);
});

test("video editor contains no network upload implementation", () => {
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|https?:\/\//i);
  assert.match(html, /Tidak ada upload ke server ZERO/i);
});
