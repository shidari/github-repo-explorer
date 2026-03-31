import { swaggerUI } from "@hono/swagger-ui";
import { Config, Effect } from "effect";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { RateLimitMiddleware } from "./middleware/rate-limit";
import { SearchApp } from "./search";

export const mainAppProgram = Effect.gen(function* () {
  const searchApp = yield* SearchApp;
  const { middleware: rateLimitMiddleware } = yield* RateLimitMiddleware;

  const app = new Hono()
    .basePath("/api")
    .use(rateLimitMiddleware)
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
