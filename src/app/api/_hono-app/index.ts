import { swaggerUI } from "@hono/swagger-ui";
import { Config, Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "./middleware/rate-limit";
import { SearchApp } from "./search";

// SearchApp を合成した Hono アプリケーション
export class MainApp extends Effect.Service<MainApp>()("MainApp", {
  effect: Effect.gen(function* () {
    const searchApp = yield* SearchApp;
    const { middleware: rateLimitMiddleware } = yield* RateLimitMiddleware;

    const app = new Hono()
      .basePath("/api")
      .use("*", rateLimitMiddleware)
      .route("/search", searchApp);

    const isDev = yield* Config.string("NODE_ENV").pipe(
      Config.map((env) => env === "development"),
      Config.withDefault(false),
    );

    if (isDev) {
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
    }

    // 直接 Hono インスタンスを返すと Effect.Service の型として推論され
    // RPC クライアントの型が解決できなくなるため、オブジェクトで包む
    return { app };
  }),
}) {}

// Layer を上から順に provide して依存を解決
export const app = await Effect.runPromise(
  Effect.gen(function* () {
    const { app } = yield* MainApp;
    return app;
  }).pipe(
    Effect.provide(MainApp.Default),
    Effect.provide(SearchApp.Default),
    Effect.provide(RateLimitMiddleware.Default),
    Effect.provide(RateLimitConfigTag.main),
    Effect.provide(
      process.env.NODE_ENV === "production" ? DB.main : DB.test,
    ),
    Effect.provide(
      process.env.NODE_ENV === "production"
        ? SearchReposQuery.main
        : SearchReposQuery.test,
    ),
  ),
);

export type AppType = typeof app;
