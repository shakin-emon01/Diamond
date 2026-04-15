import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ideRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(ideRoot, "..");
const compilerCoreDir = path.join(repoRoot, "diamond-compiler", "core");
const wasmPublicDir = path.join(ideRoot, "public", "wasm");
const workerPublicDir = path.join(ideRoot, "public", "workers");
const workerSource = path.join(__dirname, "diamond-wasm-worker.js");

mkdirSync(wasmPublicDir, { recursive: true });
mkdirSync(workerPublicDir, { recursive: true });

const wasmAssets = [
  ["diamond.js", path.join(compilerCoreDir, "diamond.js")],
  ["diamond.wasm", path.join(compilerCoreDir, "diamond.wasm")]
];

let copiedCount = 0;

for (const [filename, sourcePath] of wasmAssets) {
  const targetPath = path.join(wasmPublicDir, filename);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    copiedCount += 1;
    continue;
  }

  const readmePath = path.join(wasmPublicDir, "README.md");
  if (!existsSync(readmePath)) {
    writeFileSync(
      readmePath,
      [
        "Build the WebAssembly bundle from `diamond-compiler/core` and rerun `npm run sync:wasm`.",
        "",
        "Expected files:",
        "- `diamond.js`",
        "- `diamond.wasm`"
      ].join("\n"),
      "utf8"
    );
  }
}

copyFileSync(workerSource, path.join(workerPublicDir, "diamond-wasm-worker.js"));

for (const stalePath of [
  path.join(ideRoot, "public", "diamond.js"),
  path.join(ideRoot, "public", "diamond.wasm")
]) {
  if (existsSync(stalePath)) {
    rmSync(stalePath, { force: true });
  }
}

const summary = [
  `[sync-wasm-assets] worker copied from ${path.relative(ideRoot, workerSource)}`,
  `[sync-wasm-assets] ${copiedCount}/${wasmAssets.length} compiler assets copied from ${path.relative(ideRoot, compilerCoreDir)}`
];

console.log(summary.join("\n"));
