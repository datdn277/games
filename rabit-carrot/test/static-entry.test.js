import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("static host can load every vendored Three.js module", () => {
  const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
  const importMapSource = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];

  assert.ok(importMapSource, "index.html must define an import map");

  const threeEntry = JSON.parse(importMapSource).imports?.three;
  assert.match(threeEntry, /^\.\/vendor\//, "Three.js must be published with the static game");

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
