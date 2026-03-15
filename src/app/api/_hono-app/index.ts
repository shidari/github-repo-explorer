import { swaggerUI } from "@hono/swagger-ui";
import { Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { GetRepoByFullNameQuery, SearchReposQuery } from "@/lib/github/query";
import { DetailApp } from "./detail";
import { SearchApp } from "./search";

// SearchApp, DetailApp を合成した Hono アプリケーション
export class MainApp extends Effect.Service<MainApp>()("MainApp", {
  effect: Effect.gen(function* () {
    const searchApp = yield* SearchApp;
    const detailApp = yield* DetailApp;

    const app = new Hono()
      .route("/search", searchApp)
      .route("/repos", detailApp);

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

    return app;
  }),
}) {}

// Layer を上から順に provide して依存を解決
export const app = Effect.runSync(
  Effect.gen(function* () {
    return yield* MainApp;
  }).pipe(
    Effect.provide(MainApp.Default),
    Effect.provide(SearchApp.Default),
    Effect.provide(DetailApp.Default),
    // TODO: rate limit 実装後に .main に切り替える
    Effect.provide(SearchReposQuery.test),
    Effect.provide(GetRepoByFullNameQuery.test),
  ),
);

export type AppType = typeof app;
