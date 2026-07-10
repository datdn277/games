import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);

test("entry dùng đường dẫn tương đối khi mở từ menu trang chủ", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  assert.match(html, /src="\.\/src\/main\.js"/);
  assert.doesNotMatch(html, /src="\/src\/main\.js"/);
  assert.match(html, /href="\.\/src\/styles\.css"/);
});

test("static entry ánh xạ Three.js sau npm install", async () => {
  const html = await readFile(new URL("index.html", projectRoot), "utf8");
  assert.match(html, /"three": "\.\/node_modules\/three\/build\/three\.module\.js"/);
});

test("Three.js có fallback 2D thay vì làm trắng toàn bộ game", async () => {
  const sceneSource = await readFile(new URL("src/three-scene.js", projectRoot), "utf8");
  assert.match(sceneSource, /await import\("three"\)/);
  assert.match(sceneSource, /game tiếp tục ở chế độ 2D/);
});
