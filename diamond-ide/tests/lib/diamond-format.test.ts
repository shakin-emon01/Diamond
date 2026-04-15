import { describe, expect, it } from "vitest";

import { formatDiamondCode } from "../../lib/diamond-format";

describe("formatDiamondCode", () => {
  it("normalizes indentation, spacing, and inline comments", () => {
    const source = `shuru

dhoro shonkha total=0;
dhoro shonkha bonus=5; // comment

jodi( total<10){
dekhao( total+bonus );
}

shesh`;

    expect(formatDiamondCode(source)).toBe(`shuru

dhoro shonkha total = 0;
dhoro shonkha bonus = 5;  // comment

jodi (total < 10) {
    dekhao(total + bonus);
}

shesh`);
  });

  it("aligns consecutive assignments in the same block", () => {
    const source = `shuru

a=1;
longValue=2;
name="Diamond";

shesh`;

    expect(formatDiamondCode(source)).toBe(`shuru

a         = 1;
longValue = 2;
name      = "Diamond";

shesh`);
  });
});
