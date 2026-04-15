import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runDiamondProgram } from "../../lib/diamond-runtime";
import { compileDiamond } from "../../lib/wasm-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, "../../../diamond-compiler/tests/programs/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Array<{
  id: string;
  file: string;
  expectedSuccess: boolean;
  stdin: string;
  expectedLines: string[];
}>;

describe("fixture pipeline", () => {
  for (const fixture of manifest) {
    it(`compiles and validates ${fixture.id}`, async () => {
      const sourcePath = path.resolve(
        __dirname,
        "../../../diamond-compiler/tests/programs",
        fixture.file
      );
      const source = readFileSync(sourcePath, "utf8");
      const compiled = await compileDiamond(source);

      if (!fixture.expectedSuccess) {
        expect(compiled.success || compiled.errors.length === 0).toBe(false);
        return;
      }

      expect(compiled.success).toBe(true);
      expect(compiled.errors).toHaveLength(0);
      expect(compiled.ast).not.toBeNull();

      const runtime = runDiamondProgram(compiled.ast, { stdin: fixture.stdin });
      expect(runtime.error).toBeNull();
      expect(runtime.lines).toEqual(fixture.expectedLines);
    });
  }
});
