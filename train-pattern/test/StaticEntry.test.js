import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("static entry", () => {
  it("publishes every vendored Three.js module", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
    const importMapSource = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];

    expect(importMapSource).toBeTruthy();

    const threeEntry = JSON.parse(importMapSource).imports?.three;
    expect(threeEntry).toMatch(/^\.\/vendor\//);

    const threeEntryPath = resolve(projectRoot, threeEntry);
    expect(existsSync(threeEntryPath), `${threeEntry} must exist`).toBe(true);

    const threeSource = readFileSync(threeEntryPath, "utf8");
    const relativeImports = [...threeSource.matchAll(/from\s*["'](\.\/[^"']+)["']/g)];

    for (const [, specifier] of relativeImports) {
      expect(
        existsSync(resolve(dirname(threeEntryPath), specifier)),
        `${specifier} imported by ${threeEntry} must exist`
      ).toBe(true);
    }
  });
});
