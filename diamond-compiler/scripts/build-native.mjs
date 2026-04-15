import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compilerRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(compilerRoot, "..");
const coreDir = path.join(compilerRoot, "core");
const outputBinary = path.join(compilerRoot, process.platform === "win32" ? "diamond.exe" : "diamond");

function fail(message) {
  throw new Error(message);
}

function resolveExecutable(label, candidates) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (candidate.includes(path.sep) || candidate.includes("/")) {
      if (existsSync(candidate)) {
        return candidate;
      }
      continue;
    }

    const result = spawnSync(candidate, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
    if (result.status === 0) {
      return candidate;
    }
  }

  fail(`Unable to locate ${label}. Checked: ${candidates.filter(Boolean).join(", ")}`);
}

function run(command, args, cwd = coreDir) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32" && !command.includes(path.sep)
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

const bison = resolveExecutable("bison", [
  process.env.DIAMOND_BISON,
  path.join(workspaceRoot, ".tools", "winflexbison", "win_bison.exe"),
  path.join(workspaceRoot, ".tools", "winflexbison", "bison.exe"),
  "win_bison.exe",
  "bison"
]);

const flex = resolveExecutable("flex", [
  process.env.DIAMOND_FLEX,
  path.join(workspaceRoot, ".tools", "winflexbison", "win_flex.exe"),
  path.join(workspaceRoot, ".tools", "winflexbison", "flex.exe"),
  "win_flex.exe",
  "flex"
]);

const gcc = resolveExecutable("gcc", [
  process.env.DIAMOND_GCC,
  path.join(workspaceRoot, ".tools", "winlibs", "mingw64", "bin", "gcc.exe"),
  "gcc.exe",
  "gcc"
]);

console.log(`[build-native] Using bison: ${bison}`);
console.log(`[build-native] Using flex : ${flex}`);
console.log(`[build-native] Using gcc  : ${gcc}`);

run(bison, ["-d", "parser.y"]);
run(flex, ["lexer.l"]);

run(gcc, [
  "lex.yy.c",
  "parser.tab.c",
  "ast.c",
  "preprocess.c",
  "symtab.c",
  "tac.c",
  "driver.c",
  "-o",
  outputBinary
]);

console.log(`[build-native] Built ${outputBinary}`);
