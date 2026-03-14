import { FastCheck, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { NonNegativeIntFromString } from "../app/api/_hono-app/search";

describe("NonNegativeIntFromString", () => {
  it("非負整数の文字列を decode すると 0 以上の整数になる", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (n) => {
          const decoded = Schema.decodeUnknownSync(NonNegativeIntFromString)(
            String(n),
          );
          expect(decoded).toBe(n);
        },
      ),
    );
  });
});
