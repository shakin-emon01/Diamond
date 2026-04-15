import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compilerRoot = path.resolve(__dirname, "..");
const programsDir = path.join(__dirname, "programs");
const sharedManifestPath = path.join(programsDir, "manifest.json");
const nativeManifestPath = path.join(__dirname, "native-manifest.json");
const reportDir = path.join(__dirname, "report");
const binaryPath =
  process.env.DIAMOND_NATIVE_BIN ||
  path.join(compilerRoot, process.platform === "win32" ? "diamond.exe" : "diamond");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function runCompiler(filePath) {
  const result = spawnSync(binaryPath, [filePath], {
    cwd: compilerRoot,
    encoding: "utf8",
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout?.trim();
  assert(stdout, `Compiler produced no JSON output for ${path.basename(filePath)}`);
  return JSON.parse(stdout);
}

function normalizeSharedCases() {
  return loadJson(sharedManifestPath).map((fixture) => ({
    id: fixture.id,
    file: path.join(programsDir, fixture.file),
    expectedSuccess: fixture.expectedSuccess,
    requiresAssembly: fixture.expectedSuccess
  }));
}

function normalizeNativeCases() {
  return loadJson(nativeManifestPath).map((fixture) => ({
    ...fixture,
    file: path.join(__dirname, fixture.file)
  }));
}

function verifyCase(testCase, result) {
  assert(
    Boolean(result.success) === Boolean(testCase.expectedSuccess),
    `Expected success=${testCase.expectedSuccess} but received success=${result.success}`
  );

  if (testCase.expectedSuccess) {
    assert(Array.isArray(result.tokens) && result.tokens.length > 0, "Token stream is missing.");
    assert(result.ast, "AST output is missing.");
    assert(Array.isArray(result.symbolTable) && result.symbolTable.length > 0, "Symbol table is missing.");
    assert(Array.isArray(result.rawTac) && result.rawTac.length >= (testCase.minRawTac ?? 1), "Raw TAC is missing.");
    assert(Array.isArray(result.tac) && result.tac.length > 0, "Optimized TAC is missing.");

    if (testCase.requiresAssembly ?? true) {
      assert(typeof result.assembly === "string" && result.assembly.length > 0, "Assembly listing is missing.");
    }

    if (Array.isArray(testCase.containsSymbol)) {
      const symbolNames = new Set((result.symbolTable ?? []).map((symbol) => symbol.name));
      for (const symbolName of testCase.containsSymbol) {
        assert(symbolNames.has(symbolName), `Expected symbol '${symbolName}' was not found.`);
      }
    }
  } else {
    assert(Array.isArray(result.errors) && result.errors.length > 0, "Expected diagnostics for failing case.");
  }

  if (typeof testCase.expectedPreprocessImports === "number") {
    assert(
      result.meta?.preprocessImports === testCase.expectedPreprocessImports,
      `Expected preprocessImports=${testCase.expectedPreprocessImports} but received ${result.meta?.preprocessImports}`
    );
  }

  if (typeof testCase.expectedPreprocessRecordTypes === "number") {
    assert(
      result.meta?.preprocessRecordTypes === testCase.expectedPreprocessRecordTypes,
      `Expected preprocessRecordTypes=${testCase.expectedPreprocessRecordTypes} but received ${result.meta?.preprocessRecordTypes}`
    );
  }

  if (typeof testCase.expectedPreprocessRecordVariables === "number") {
    assert(
      result.meta?.preprocessRecordVariables === testCase.expectedPreprocessRecordVariables,
      `Expected preprocessRecordVariables=${testCase.expectedPreprocessRecordVariables} but received ${result.meta?.preprocessRecordVariables}`
    );
  }

  if (typeof testCase.expectedErrorIncludes === "string") {
    const messages = (result.errors ?? []).map((error) => error.message).join("\n");
    assert(
      messages.toLowerCase().includes(testCase.expectedErrorIncludes.toLowerCase()),
      `Expected diagnostic containing '${testCase.expectedErrorIncludes}' but received:\n${messages}`
    );
  }
}

const cases = [...normalizeSharedCases(), ...normalizeNativeCases()];
const results = [];
let passed = 0;

assert(path.isAbsolute(binaryPath) || binaryPath === "diamond" || binaryPath === "diamond.exe", "Invalid binary path.");

for (const testCase of cases) {
  try {
    const result = runCompiler(testCase.file);
    verifyCase(testCase, result);
    results.push({
      id: testCase.id,
      file: path.relative(compilerRoot, testCase.file),
      passed: true,
      success: result.success,
      errors: result.errors?.length ?? 0,
      preprocessImports: result.meta?.preprocessImports ?? 0,
      preprocessRecordTypes: result.meta?.preprocessRecordTypes ?? 0,
      preprocessRecordVariables: result.meta?.preprocessRecordVariables ?? 0
    });
    passed += 1;
  } catch (error) {
    results.push({
      id: testCase.id,
      file: path.relative(compilerRoot, testCase.file),
      passed: false,
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

mkdirSync(reportDir, { recursive: true });

writeFileSync(
  path.join(reportDir, "latest-results.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      binaryPath,
      total: cases.length,
      passed,
      failed: cases.length - passed,
      results
    },
    null,
    2
  )
);

writeFileSync(
  path.join(reportDir, "dashboard.md"),
  [
    "# Native Regression Dashboard",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Binary: \`${binaryPath}\``,
    "",
    `Passed ${passed} of ${cases.length} native regression checks.`,
    "",
    "| Case | File | Status | Notes |",
    "|---|---|---|---|",
    ...results.map((entry) =>
      `| ${entry.id} | ${entry.file} | ${entry.passed ? "PASS" : "FAIL"} | ${
        entry.passed
          ? `errors=${entry.errors}, imports=${entry.preprocessImports}, recordTypes=${entry.preprocessRecordTypes}, recordVars=${entry.preprocessRecordVariables}`
          : String(entry.message).replace(/\|/g, "\\|")
      } |`
    )
  ].join("\n")
);

if (passed !== cases.length) {
  console.error(`[native-regression] ${cases.length - passed} case(s) failed.`);
  process.exit(1);
}

console.log(`[native-regression] All ${passed} case(s) passed.`);
