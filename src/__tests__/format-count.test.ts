import { FastCheck } from "effect";
import { describe, expect, it } from "vitest";
import { formatCount } from "../components/features/search/RepoOverview";

describe("formatCount", () => {
  it("1000 以上なら k 表記になる", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 1000, max: Number.MAX_SAFE_INTEGER }),
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
