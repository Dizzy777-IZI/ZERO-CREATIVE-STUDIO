import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const html = await readFile(new URL("../web/cloudflare/editor.html", import.meta.url), "utf8");

test("photo editor exposes local image input and supported formats", () => {
  assert.match(html, /type="file" accept="image\/jpeg,image\/png,image\/webp,image\/avif"/);
  assert.match(html, /MAX_BYTES = 30 \* 1024 \* 1024/);
  assert.match(html, /URL\.createObjectURL\(file\)/);
});

test("photo editor includes non-destructive basic adjustments and export", () => {
  for (const control of ["brightness", "contrast", "saturation", "rotate", "reset", "download"]) {
    assert.match(html, new RegExp('id="' + control + '"'));
  }
  assert.match(html, /canvas\.toBlob/);
  assert.match(html, /link\.download = "zero-edit-/);
});

test("photo editor does not upload media or call external APIs", () => {
  assert.doesNotMatch(html, /fetch\s*\(/);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /Tidak ada upload ke server/);
});
