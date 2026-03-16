import { swaggerUI } from "@hono/swagger-ui";
import { Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { SearchReposQuery } from "@/query";
import { SearchApp } from "./search";

// SearchApp を合成した Hono アプリケーション
export class MainApp extends Effect.Service<MainApp>()("MainApp", {
  effect: Effect.gen(function* () {
    const searchApp = yield* SearchApp;

    const app = new Hono()
      .basePath("/api")
      .route("/search", searchApp);

    app.get("/", (c) => c.redirect("/doc"));
    app.get("/doc", swaggerUI({ url: "/openapi" }));
    app.get(
      "/openapi",
      openAPIRouteHandler(app, {
        documentation: {
          info: { title: "GitHub Repo Explorer API", version: "0.1.0" },
        },
      }),
    );

    // 直接 Hono インスタンスを返すと Effect.Service の型として推論され
    // RPC クライアントの型が解決できなくなるため、オブジェクトで包む
    return { app };
  }),
}) {}

// Layer を上から順に provide して依存を解決
export const app = Effect.runSync(
  Effect.gen(function* () {
    const { app } = yield* MainApp;
    return app;
  }).pipe(
    Effect.provide(MainApp.Default),
    Effect.provide(SearchApp.Default),
    // TODO: rate limit 実装後に .main に切り替える
    Effect.provide(SearchReposQuery.test),
  ),
);

export type AppType = typeof app;
