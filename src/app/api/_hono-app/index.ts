import { swaggerUI } from "@hono/swagger-ui";
import { Config, Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";
import {
  InternalAuthConfigTag,
  InternalAuthMiddleware,
} from "./middleware/internal-auth";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "./middleware/rate-limit";
import { SearchApp } from "./search";

// ── Program ──

export const mainAppProgram = Effect.gen(function* () {
  const searchApp = yield* SearchApp;
  const { middleware: internalAuthMiddleware } = yield* InternalAuthMiddleware;
  const { middleware: rateLimitMiddleware } = yield* RateLimitMiddleware;

  const app = new Hono()
    .basePath("/api")
    .use("*", internalAuthMiddleware)
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

  return app;
});

// ── Runnable ──

const runnable = mainAppProgram.pipe(
  Effect.provide(SearchApp.Default),
  Effect.provide(InternalAuthMiddleware.Default),
  Effect.provide(
    process.env.NODE_ENV === "production"
      ? InternalAuthConfigTag.main
      : InternalAuthConfigTag.test,
  ),
  Effect.provide(RateLimitMiddleware.Default),
  Effect.provide(RateLimitConfigTag.main),
  Effect.provide(process.env.NODE_ENV === "production" ? DB.main : DB.test),
  Effect.provide(
    process.env.NODE_ENV === "production"
      ? SearchReposQuery.main
      : SearchReposQuery.test,
  ),
);

// ── App ──

export const app = await Effect.runPromise(runnable);

export type AppType = typeof app;
