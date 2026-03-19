import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vitest";
import { mainAppProgram } from "@/app/api/_hono-app";
import {
  InternalAuthConfigTag,
  InternalAuthMiddleware,
} from "@/app/api/_hono-app/middleware/internal-auth";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "@/app/api/_hono-app/middleware/rate-limit";
import { SearchApp } from "@/app/api/_hono-app/search";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";

const WITH_AUTH = { "x-internal-token": "test-token" };

describe("internal auth", () => {
  it("x-internal-token ヘッダーなしのリクエストは 401 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(RateLimitConfigTag.test),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const res = await app.request("/api/search?q=react");
    expect(res.status).toBe(401);
  });

  it("正しい x-internal-token ヘッダーがあれば 200 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(RateLimitConfigTag.test),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const res = await app.request("/api/search?q=react", {
      headers: WITH_AUTH,
    });
    expect(res.status).toBe(200);
  });
});

describe("rate limiter", () => {
  it("レートリミット内のリクエストは 200 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, {
            perUser: { maxTokens: 3, refillRate: 0 },
            global: { maxTokens: 100, refillRate: 0 },
          }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const res = await app.request("/api/search?q=react", {
      headers: WITH_AUTH,
    });
    expect(res.status).toBe(200);
  });

  it("レートリミットを超えたら 429 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, {
            perUser: { maxTokens: 3, refillRate: 0 },
            global: { maxTokens: 100, refillRate: 0 },
          }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const clientId = crypto.randomUUID();
    const headers = { ...WITH_AUTH, "x-client-id": clientId };

    for (let i = 0; i < 3; i++) {
      const res = await app.request("/api/search?q=react", { headers });
      expect(res.status).toBe(200);
    }

    const res = await app.request("/api/search?q=react", { headers });
    expect(res.status).toBe(429);
  });

  it("一定時間経過後にトークンが回復し 200 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, {
            perUser: { maxTokens: 2, refillRate: 1 },
            global: { maxTokens: 100, refillRate: 0 },
          }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    const now = Date.now();
    vi.setSystemTime(now);

    const clientId = crypto.randomUUID();
    const headers = { ...WITH_AUTH, "x-client-id": clientId };

    const first = await app.request("/api/search?q=react", { headers });
    expect(first.status).toBe(200);

    const second = await app.request("/api/search?q=react", { headers });
    expect(second.status).toBe(200);

    const third = await app.request("/api/search?q=react", { headers });
    expect(third.status).toBe(429);

    // 2 秒進める → 2 トークン回復
    vi.setSystemTime(now + 2000);

    const fourth = await app.request("/api/search?q=react", { headers });
    expect(fourth.status).toBe(200);

    vi.useRealTimers();
  });

  it("グローバルレートリミットを超えたら 429 を返す", async () => {
    const app = await Effect.runPromise(
      mainAppProgram.pipe(
        Effect.provide(SearchApp.Default),
        Effect.provide(InternalAuthMiddleware.Default),
        Effect.provide(InternalAuthConfigTag.test),
        Effect.provide(RateLimitMiddleware.Default),
        Effect.provide(
          Layer.succeed(RateLimitConfigTag, {
            perUser: { maxTokens: 100, refillRate: 0 },
            global: { maxTokens: 2, refillRate: 0 },
          }),
        ),
        Effect.provide(DB.test),
        Effect.provide(SearchReposQuery.test),
      ),
    );

    // 異なるユーザー（Cookie なし）から3リクエスト同時送信
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        app.request("/api/search?q=react", { headers: WITH_AUTH }),
      ),
    );
    const statuses = results.map((r) => r.status);

    // global maxTokens=2 なので、少なくとも1つは 429
    expect(statuses).toContain(429);
  });
});
