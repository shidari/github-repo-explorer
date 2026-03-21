import { FastCheck } from "effect";
import { describe, expect, it } from "vitest";
import { pageNumbers } from "../components/ui/pagination";
import { naturals } from "../util";

describe("pageNumbers", () => {
  it("7ページ以下なら全ページを表示", () => {
    const arb = FastCheck.tuple(
      FastCheck.integer({ min: 1, max: 7 }),
      FastCheck.integer({ min: 1, max: 7 }),
    ).filter(([current, total]) => current <= total);

    FastCheck.assert(
      FastCheck.property(arb, ([current, total]) => {
        const result = pageNumbers(current, total);
        expect(result).toEqual(naturals().drop(1).take(total).toArray());
      }),
    );
  });

  it("current=1: [current, ...pages, '...', last]", () => {
    const arb = FastCheck.integer({ min: 8, max: 10000 }).map(
      (total) => [1, total] as const,
    );

    FastCheck.assert(
      FastCheck.property(arb, ([current, total]) => {
        const result = pageNumbers(current, total);
        const pages = result.slice(0, -2);
        const rightEllipsis = result[result.length - 2];
        const last = result[result.length - 1];

        expect(pages).toEqual(
          naturals().drop(current).take(pages.length).toArray(),
        );
        expect(rightEllipsis).toBe("...");
        expect(last).toBe(total);
      }),
    );
  });

  it("current=2,3: [1, ...pages, '...', last]", () => {
    const arb = FastCheck.tuple(
      FastCheck.integer({ min: 2, max: 3 }),
      FastCheck.integer({ min: 8, max: 10000 }),
    );

    FastCheck.assert(
      FastCheck.property(arb, ([current, total]) => {
        const result = pageNumbers(current, total);
        const top = result[0];
        const pages = result.slice(1, -2);
        const rightEllipsis = result[result.length - 2];
        const last = result[result.length - 1];

        expect(top).toBe(1);
        // pageNumbers の戻り値は (number | "...")[] だが、このパターンでは pages は数値のみ
        const start = pages[0] as number;
        expect(pages).toEqual(
          naturals().drop(start).take(pages.length).toArray(),
        );
        expect(pages).toContain(current);
        expect(rightEllipsis).toBe("...");
        expect(last).toBe(total);
      }),
    );
  });

  it("両方あり: [1, '...', prev, current, next, '...', last]", () => {
    const arb = FastCheck.tuple(
      FastCheck.integer({ min: 4, max: 10000 }),
      FastCheck.integer({ min: 8, max: 10000 }),
    ).filter(([current, total]) => current <= total - 3);

    FastCheck.assert(
      FastCheck.property(arb, ([current, total]) => {
        const result = pageNumbers(current, total);
        const [top, leftEllipsis, prev, cur, next, rightEllipsis, last] =
          result;

        expect(top).toBe(1);
        expect(leftEllipsis).toBe("...");
        expect(prev).toBe(current - 1);
        expect(cur).toBe(current);
        expect(next).toBe(current + 1);
        expect(rightEllipsis).toBe("...");
        expect(last).toBe(total);
      }),
    );
  });

  it("左あり・右なし: [1, '...', ...pages]", () => {
    const arb = FastCheck.tuple(
      FastCheck.integer({ min: 1, max: 10000 }),
      FastCheck.integer({ min: 8, max: 10000 }),
    ).filter(([current, total]) => current >= total - 2 && current <= total);

    FastCheck.assert(
      FastCheck.property(arb, ([current, total]) => {
        const result = pageNumbers(current, total);
        const top = result[0];
        const leftEllipsis = result[1];
        const pages = result.slice(2);

        expect(top).toBe(1);
        expect(leftEllipsis).toBe("...");
        // pageNumbers の戻り値は (number | "...")[] だが、このパターンでは pages は数値のみ
        const start = pages[0] as number;
        expect(pages).toEqual(
          naturals().drop(start).take(pages.length).toArray(),
        );
        expect(pages).toContain(current);
        expect(pages[pages.length - 1]).toBe(total);
      }),
    );
  });
});
