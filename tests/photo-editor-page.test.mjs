import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");

test("photo editor exposes local image input and supported formats", () => {
  assert.match(html, /type="file" accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
  assert.match(html, /MAX_BYTES=30\*1024\*1024/);
  assert.match(html, /MAX_PIXELS=40_000_000/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
});

test("photo editor includes non-destructive adjustments and guarded PNG export", () => {
  for (const control of ["brightness", "contrast", "saturation", "rotate", "reset", "download"]) {
    assert.match(html, new RegExp('id="' + control + '"'));
  }
  assert.match(html, /canvas\.toBlob/);
  assert.match(html, /if\(!blob\|\|!blob\.size\)/);
  assert.match(html, /setTimeout\(\(\)=>URL\.revokeObjectURL\(url\),1500\)/);
});

test("photo editor ignores stale image loads and releases object URLs", () => {
  assert.match(html, /let sourceImage=null,sourceUrl=null,rotation=0,loadSequence=0/);
  assert.match(html, /sequence!==loadSequence\|\|sourceUrl!==url/);
  assert.match(html, /function releaseSource\(\)/);
  assert.match(html, /URL\.revokeObjectURL\(sourceUrl\)/);
  assert.match(html, /image\.onerror/);
  assert.match(html, /if\(render\(\)\)announce\("Foto berhasil dibuka/);
  assert.match(html, /return false/);
});

test("photo editor rejects invalid dimensions and does not upload media", () => {
  assert.match(html, /naturalWidth\*image\.naturalHeight>MAX_PIXELS/);
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /Tidak ada upload ke server/);
});

test("photo editor inline script parses and reports preview failures", () => {
  const script = html.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1];
  assert.ok(script, "inline editor script exists");
  assert.doesNotThrow(() => new Script(script));
  assert.match(script, /if\(render\(\)\)announce/);
  assert.match(script, /catch\(error\)/);
});
