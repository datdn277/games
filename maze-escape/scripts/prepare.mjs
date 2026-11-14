import { mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = resolve(projectRoot, ".generated");
rmSync(generatedDir, { recursive: true, force: true });
mkdirSync(generatedDir, { recursive: true });

const compiler = resolve(projectRoot, "node_modules/typescript/lib/tsc.js");
const result = spawnSync(process.execPath, [compiler, "-p", "tsconfig.emit.json"], {
  cwd: projectRoot,
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);
