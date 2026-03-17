import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { MainApp } from "@/app/api/_hono-app";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "@/app/api/_hono-app/middleware/rate-limit";
import { SearchApp } from "@/app/api/_hono-app/search";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";

describe("rate limiter", () => {
  it("レートリミット内のリクエストは 200 を返す", async () => {
    const app = await Effect.runPromise(
      Effect.gen(function* () {
        const { app } = yield* MainApp;
        return app;
      }).pipe(
        Effect.provide(MainApp.Default),
        Effect.provide(SearchApp.Default),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, { maxTokens: 3, refillRate: 0 }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const res = await app.request("/api/search?q=react");
    expect(res.status).toBe(200);
  });

  it("レートリミットを超えたら 429 を返す", async () => {
    const app = await Effect.runPromise(
      Effect.gen(function* () {
        const { app } = yield* MainApp;
        return app;
      }).pipe(
        Effect.provide(MainApp.Default),
        Effect.provide(SearchApp.Default),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, { maxTokens: 3, refillRate: 0 }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const first = await app.request("/api/search?q=react");
    expect(first.status).toBe(200);
    const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";

    for (let i = 0; i < 2; i++) {
      const res = await app.request("/api/search?q=react", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
    }

    const res = await app.request("/api/search?q=react", {
      headers: { cookie },
    });
    expect(res.status).toBe(429);
  });

  it("一定時間経過後にトークンが回復し 200 を返す", async () => {
    const app = await Effect.runPromise(
      Effect.gen(function* () {
        const { app } = yield* MainApp;
        return app;
      }).pipe(
        Effect.provide(MainApp.Default),
        Effect.provide(SearchApp.Default),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, { maxTokens: 2, refillRate: 1 }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const now = Date.now();
    vi.setSystemTime(now);

    const first = await app.request("/api/search?q=react");
    expect(first.status).toBe(200);
    const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";

    const second = await app.request("/api/search?q=react", {
      headers: { cookie },
    });
    expect(second.status).toBe(200);

    const third = await app.request("/api/search?q=react", {
      headers: { cookie },
    });
    expect(third.status).toBe(429);

    // 2 秒進める → 2 トークン回復
    vi.setSystemTime(now + 2000);

    const fourth = await app.request("/api/search?q=react", {
      headers: { cookie },
    });
    expect(fourth.status).toBe(200);

    vi.useRealTimers();
  });
});
