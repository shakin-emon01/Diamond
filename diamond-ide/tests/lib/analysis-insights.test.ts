import { describe, expect, it } from "vitest";

import { buildScopeInsight, buildTypeInsights, buildTypeSuggestions } from "../../lib/analysis/insights";
import { buildFallbackResult } from "../../lib/mock-compiler";

describe("analysis insights", () => {
  const source = `kaj jog(a, b) {
    ferot a + b;
}

shuru

dhoro shonkha i;
dhoro shonkha total;
dhoro shonkha nums[2];

total = 0;

ghurao (i = 0; i < 2; i = i + 1) {
    nums[i] = i + 1;
    total = total + nums[i];
}

dekhao(jog(total, 1));

shesh
`;

  const result = buildFallbackResult(source);

  it("builds a nested scope tree with declared symbols", () => {
    const insight = buildScopeInsight(result.ast, result.symbolTable, source);

    expect(insight.root?.label).toBe("Program");
    expect(insight.flat.some((scope) => scope.label.includes("Function jog"))).toBe(true);
    expect(insight.flat.some((scope) => scope.label.includes("ghurao loop"))).toBe(true);
    expect(insight.flat.some((scope) => scope.symbols.some((symbol) => symbol.name === "total"))).toBe(
      true
    );
  });

  it("surfaces expected vs inferred types", () => {
    const insights = buildTypeInsights(result.ast, result.symbolTable);

    expect(insights.some((insight) => insight.kind === "assignment")).toBe(true);
    expect(insights.some((insight) => insight.kind === "return")).toBe(true);
    expect(insights.some((insight) => insight.kind === "argument")).toBe(true);
  });

  it("builds actionable type suggestions from the current analysis state", () => {
    const warningSource = `shuru

dhoro shonkha count;

jodi (count) {
    dekhao(count);
}

shesh
`;

    const warningResult = buildFallbackResult(warningSource);
    const suggestions = buildTypeSuggestions(warningResult.ast, warningResult.symbolTable);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((suggestion) => suggestion.severity === "warning")).toBe(true);
    expect(
      suggestions.some((suggestion) => /condition|boolean/i.test(`${suggestion.title} ${suggestion.body}`))
    ).toBe(true);
  });
});
