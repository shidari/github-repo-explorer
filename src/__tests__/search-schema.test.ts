import { FastCheck, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { PositiveIntFromString } from "../app/api/_hono-app/search";

describe("PositiveIntFromString", () => {
  it("正の整数の文字列を decode すると 1 以上の整数になる", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        (n) => {
          const decoded = Schema.decodeUnknownSync(PositiveIntFromString)(
            String(n),
          );
          expect(decoded).toBe(n);
        },
      ),
    );
  });

  it("0 や負の整数の文字列は decode に失敗する", () => {
    expect(() =>
      Schema.decodeUnknownSync(PositiveIntFromString)("0"),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(PositiveIntFromString)("-1"),
    ).toThrow();
  });
});
