import { describe, expect, it } from "vitest";
import { buildQueries } from "../src/diagnose/queries.js";

describe("buildQueries", () => {
  it("エリアと業種を含む複数パターンを生成する", () => {
    const qs = buildQueries({ name: "x", aliases: [], area: "松江市", industry: "メンズサロン" });
    expect(qs.length).toBeGreaterThanOrEqual(3);
    for (const q of qs) {
      expect(q).toContain("松江市");
      expect(q).toContain("メンズサロン");
    }
  });
});
