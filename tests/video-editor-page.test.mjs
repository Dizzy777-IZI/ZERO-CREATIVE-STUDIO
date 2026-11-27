import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const html=readFileSync(new URL("../web/cloudflare/video-editor.html",import.meta.url),"utf8");
test("video editor keeps media local and enforces input size",()=>{assert.match(html,/diproses langsung di browser/i);assert.match(html,/200\s*\*\s*1024\s*\*\s*1024/);assert.match(html,/URL\.createObjectURL/);});
test("video editor provides trim preview and WebM export",()=>{assert.match(html,/id="start"/);assert.match(html,/id="end"/);assert.match(html,/previewClip/);assert.match(html,/MediaRecorder/);assert.match(html,/zero-video-clip\.webm/);});
test("video editor contains no network upload implementation",()=>{assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|https?:\/\//i);assert.match(html,/Tidak ada upload ke server ZERO/i);});
