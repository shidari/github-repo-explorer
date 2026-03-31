import { Effect } from "effect";
import { DB } from "@/infra/db";
import { SearchReposQuery } from "@/repository/query";
import { mainAppProgram } from "./_appBuilder";
import {
  RateLimitConfigTag,
  RateLimitMiddleware,
} from "./middleware/rate-limit";
import { SearchApp } from "./search";

// ── Runnable ──

const isDev = process.env.NODE_ENV === "development";

const runnable = isDev
  ? mainAppProgram.pipe(
      Effect.provide(SearchApp.Default),
      Effect.provide(RateLimitMiddleware.noop),
      Effect.provide(SearchReposQuery.test),
    )
  : mainAppProgram.pipe(
      Effect.provide(SearchApp.Default),
      Effect.provide(RateLimitMiddleware.main),
      Effect.provide(RateLimitConfigTag.main),
      Effect.provide(DB.main),
      Effect.provide(SearchReposQuery.main),
    );

// ── App ──

export const app = await Effect.runPromise(runnable);

export type AppType = typeof app;
