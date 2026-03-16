import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { MainApp } from "@/app/api/_hono-app";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "@/app/api/_hono-app/middleware/rate-limit";
import { SearchApp } from "@/app/api/_hono-app/search";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";

function createTestApp() {
  return Effect.runPromise(
    Effect.gen(function* () {
      const { app } = yield* MainApp;
      return app;
    }).pipe(
      Effect.provide(MainApp.Default),
      Effect.provide(SearchApp.Default),
      Effect.provide(RateLimitMiddleware.Default),
      Effect.provide(RateLimitConfigTag.test),
      Effect.provide(DB.test),
      Effect.provide(SearchReposQuery.test),
    ),
  );
}

describe("rate limiter", () => {
  it("レートリミット内のリクエストは 200 を返す", async () => {
    const app = await createTestApp();
    const res = await app.request("/api/search?q=react");
    expect(res.status).toBe(200);
  });

  it("レートリミットを超えたら 429 を返す", async () => {
    const app = await createTestApp();

    // 初回リクエストで Set-Cookie を受け取る
    const first = await app.request("/api/search?q=react");
    expect(first.status).toBe(200);
    const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";

    // 残り 2 回（maxTokens=3 なので初回含め 3 回まで OK）
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/api/search?q=react", {
        headers: { cookie },
      });
      expect(res.status).toBe(200);
    }

    // 4 回目は 429
    const res = await app.request("/api/search?q=react", {
      headers: { cookie },
    });
    expect(res.status).toBe(429);
  });
});
