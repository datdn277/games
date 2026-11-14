import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prepare = spawnSync(process.execPath, [resolve(projectRoot, "scripts/prepare.mjs")], {
  cwd: projectRoot,
  stdio: "inherit",
});
if (prepare.status !== 0) process.exit(prepare.status ?? 1);

const compiler = spawn(
  process.execPath,
  [resolve(projectRoot, "node_modules/typescript/lib/tsc.js"), "-p", "tsconfig.emit.json", "--watch", "--preserveWatchOutput"],
  { cwd: projectRoot, stdio: "inherit" },
);
const vite = spawn(
  process.execPath,
  [resolve(projectRoot, "node_modules/vite/bin/vite.js"), "--host", "0.0.0.0", "--config", "vite.config.js", "--configLoader", "runner"],
  { cwd: projectRoot, stdio: "inherit" },
);

const stop = (signal) => {
  compiler.kill(signal);
  vite.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
vite.on("exit", (code) => {
  compiler.kill("SIGTERM");
  process.exit(code ?? 0);
});
