import { describe, expect, it } from "vitest";

import { buildDiamondReportHtml } from "../../lib/report-export";

describe("buildDiamondReportHtml", () => {
  it("renders escaped source and challenge metadata", () => {
    const html = buildDiamondReportHtml({
      code: `dekhao("<tag>");`,
      result: {
        success: true,
        output: "Compilation succeeded.",
        errors: [],
        ast: null,
        symbolTable: [],
        rawTac: [
          {
            index: 0,
            op: "+",
            arg1: "2",
            arg2: "3",
            result: "t1"
          }
        ],
        tac: [
          {
            index: 0,
            op: "=",
            arg1: "5",
            arg2: null,
            result: "t1"
          }
        ],
        tokens: [],
        assembly: "ADD t1, 2, 3",
        optimizations: {
          constantFolds: 1,
          strengthReductions: 0,
          commonSubexpressions: 0,
          deadCodeEliminated: 0,
          unreachableRemoved: 0
        },
        meta: {
          errorCount: 0,
          symbolCount: 0,
          rawTacCount: 1,
          tacCount: 1,
          tokenCount: 0,
          mode: "demo",
          engineStatus: "Demo mode"
        }
      },
      consoleLines: ["Hello"],
      executionStatus: "Completed",
      runtimeError: null,
      stdinText: "",
      generatedAt: "2026-04-07 17:00",
      challengeReport: {
        challengeId: "array-totalizer",
        passed: true,
        summary: "Passed all checks",
        checks: [
          {
            label: "Compilation",
            passed: true,
            detail: "The program compiled."
          }
        ]
      }
    });

    expect(html).toContain("&lt;tag&gt;");
    expect(html).toContain("array-totalizer");
    expect(html).toContain("Passed all checks");
    expect(html).toContain("IR and Code Generation");
    expect(html).toContain("Pseudo-Assembly Listing");
  });
});
