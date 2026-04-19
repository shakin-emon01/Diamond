import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ideRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(ideRoot, "..");
const compilerCoreDir = path.join(repoRoot, "diamond-compiler", "core");
const wasmManifestPath = path.join(compilerCoreDir, "diamond-wasm-manifest.json");
const wasmPublicDir = path.join(ideRoot, "public", "wasm");
const workerPublicDir = path.join(ideRoot, "public", "workers");
const workerSource = path.join(__dirname, "diamond-wasm-worker.js");

mkdirSync(wasmPublicDir, { recursive: true });
mkdirSync(workerPublicDir, { recursive: true });

const wasmAssets = [
  ["diamond.js", path.join(compilerCoreDir, "diamond.js")],
  ["diamond.wasm", path.join(compilerCoreDir, "diamond.wasm")]
];

function hashNormalizedTextFile(filePath) {
  const normalized = readFileSync(filePath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

function verifyWasmManifest() {
  const hasCompilerAssets = wasmAssets.every(([, sourcePath]) => existsSync(sourcePath));

  if (!existsSync(wasmManifestPath)) {
    if (hasCompilerAssets) {
      throw new Error(
        "[sync-wasm-assets] Missing diamond-wasm-manifest.json. Rebuild the compiler with diamond-compiler/build-wasm.ps1 before deploying."
      );
    }

    return;
  }

  const manifest = JSON.parse(readFileSync(wasmManifestPath, "utf8"));
  const sourceEntries = Array.isArray(manifest.sources) ? manifest.sources : [];
  const staleSources = [];

  for (const entry of sourceEntries) {
    const relativePath = typeof entry?.path === "string" ? entry.path : "";
    const expectedHash = typeof entry?.sha256 === "string" ? entry.sha256.toLowerCase() : "";
    const sourcePath = path.join(repoRoot, relativePath);

    if (!relativePath || !expectedHash || !existsSync(sourcePath)) {
      staleSources.push(relativePath || "[unknown source]");
      continue;
    }

    const actualHash = hashNormalizedTextFile(sourcePath);
    if (actualHash !== expectedHash) {
      staleSources.push(relativePath);
    }
  }

  if (staleSources.length > 0) {
    throw new Error(
      `[sync-wasm-assets] Compiler WASM bundle is stale relative to source files: ${staleSources.join(", ")}. Rebuild with diamond-compiler/build-wasm.ps1 before deploying.`
    );
  }
}

verifyWasmManifest();

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
