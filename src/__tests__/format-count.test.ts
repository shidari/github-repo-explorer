import { FastCheck } from "effect";
import { describe, expect, it } from "vitest";
import { formatCount } from "../app/search/page";

describe("formatCount", () => {
  it("1,000,000 以上なら 1M+ 表記になる", () => {
    expect(formatCount(1_000_000)).toBe("1M+");
    expect(formatCount(5_000_000)).toBe("1M+");
    expect(formatCount(999_999_999)).toBe("1M+");
  });

  it("1000 以上 1,000,000 未満なら k 表記になる", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 1000, max: 999_999 }),
        (n) => {
          const result = formatCount(n);
          expect(result).toMatch(/^\d+\.\dk$/);
        },
      ),
    );
  });

  it("1000 未満ならそのまま数値文字列になる", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.integer({ min: 0, max: 999 }), (n) => {
        expect(formatCount(n)).toBe(String(n));
      }),
    );
  });
});
