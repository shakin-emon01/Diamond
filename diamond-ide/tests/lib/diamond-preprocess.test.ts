import { describe, expect, it } from "vitest";

import { preprocessDiamondSource } from "../../lib/diamond-preprocess";
import { compileDiamond } from "../../lib/wasm-client";

describe("diamond preprocessing", () => {
  it("lowers record declarations and nested field access", () => {
    const result = preprocessDiamondSource(`gothon Address {
    lekha city;
}

gothon Person {
    Address home;
}

shuru
dhoro Person user;
user.home.city = "Dhaka";
shesh`);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("dhoro lekha user__home__city;");
    expect(result.code).toContain('user__home__city = "Dhaka";');
    expect(result.stats.preprocessRecordTypes).toBe(2);
    expect(result.stats.preprocessRecordVariables).toBe(1);
  });

  it("surfaces a friendly browser-side error for imports", async () => {
    const compiled = await compileDiamond(`amdani "math-utils.diu";

shuru
shesh`);

    expect(compiled.success).toBe(false);
    expect(compiled.errors[0]?.message).toMatch(/file-based native compilation/i);
    expect(compiled.meta?.preprocessImports).toBe(1);
  });
});
