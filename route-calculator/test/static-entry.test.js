import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(projectRoot, "..");

test("trang chủ liên kết đến route calculator", () => {
  const homeHtml = readFileSync(resolve(workspaceRoot, "index.html"), "utf8");

  assert.match(homeHtml, /class="game-card route-calculator"/);
  assert.match(homeHtml, /href="\.\/route-calculator\/index\.html"/);
});

test("static host tải được toàn bộ entry của route calculator", () => {
  const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
  const mainSource = readFileSync(resolve(projectRoot, "src/main.js"), "utf8");

  assert.match(html, /<link rel="stylesheet" href="\.\/src\/styles\.css"\s*\/?>/);
  assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
  assert.doesNotMatch(mainSource, /import\s+["'][^"']+\.css["']/);

  const importMapSource = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(importMapSource, "index.html must define an import map");

  const threeEntry = JSON.parse(importMapSource).imports?.three;
  assert.match(threeEntry, /vendor\//, "Three.js must come from a published vendor directory");
  assert.doesNotMatch(threeEntry, /node_modules/, "static entry must not depend on node_modules");

  const threeEntryPath = resolve(projectRoot, threeEntry);
  assert.ok(existsSync(threeEntryPath), `${threeEntry} must exist`);

  const threeSource = readFileSync(threeEntryPath, "utf8");
  const relativeImports = [...threeSource.matchAll(/from\s*["'](\.\/[^"']+)["']/g)];

  for (const [, specifier] of relativeImports) {
    assert.ok(
      existsSync(resolve(dirname(threeEntryPath), specifier)),
      `${specifier} imported by ${threeEntry} must exist`
    );
  }
});
