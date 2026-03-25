import { Effect, Schema } from "effect";
import { Hono } from "hono";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import {
  GITHUB_SEARCH_MAX_RESULTS,
  SearchReposQuery,
  SearchReposResult,
} from "@/repository/query";

// ── リクエストスキーマ ──

export const PositiveIntFromString = Schema.NumberFromString.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const PER_PAGE = 20;

const searchQuerySchema = Schema.Struct({
  q: Schema.String.pipe(Schema.nonEmptyString()).annotations({
    description: "検索キーワード",
  }),
  page: Schema.optionalWith(PositiveIntFromString, {
    default: () => 1,
  }).annotations({
    description: "ページ番号（1始まり、デフォルト: 1）",
  }),
});

// ── レスポンススキーマ ──

const searchResponseSchema = Schema.Struct({
  ...SearchReposResult.fields,
  page: Schema.NonNegativeInt,
  total_pages: Schema.NonNegativeInt,
});

const errorResponseSchema = Schema.Struct({
  message: Schema.String,
});

// ── ルーティングスペック ──

const searchRoute = describeRoute({
  description: "Search GitHub repositories",
  responses: {
    "200": {
      description: "検索結果",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(searchResponseSchema)),
        },
      },
    },
    "400": {
      description: "バリデーションエラー",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(errorResponseSchema)),
        },
      },
    },
    "404": {
      description: "検索結果なし",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(errorResponseSchema)),
        },
      },
    },
    "429": {
      description: "GitHub API rate limit 超過",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(errorResponseSchema)),
        },
      },
    },
    "500": {
      description: "サーバー側の不明なエラー",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(errorResponseSchema)),
        },
      },
    },
  },
});

// ── 実装 ──

export class SearchApp extends Effect.Service<SearchApp>()("SearchApp", {
  effect: Effect.gen(function* () {
    const searchReposQuery = yield* SearchReposQuery;
    const app = new Hono().get(
      "/",
      searchRoute,
      effectValidator(
        "query",
        Schema.standardSchemaV1(searchQuerySchema),
        (result, c) => {
          if (!result.success) {
            const raw = c.req.query();
            return c.json(
              { message: `Invalid query parameters: ${JSON.stringify(raw)}` },
              400,
            );
          }
          return undefined;
        },
      ),
      async (c) => {
        const { q, page } = c.req.valid("query");

        return await Effect.runPromise(
          searchReposQuery
            .runAction({ query: q, page, perPage: PER_PAGE })
            .pipe(
              Effect.match({
                onSuccess: (data) => {
                  const clampedTotal = Math.min(
                    data.total_count,
                    GITHUB_SEARCH_MAX_RESULTS,
                  );
                  const totalPages = Math.ceil(clampedTotal / PER_PAGE);
                  return c.json(
                    { ...data, page, total_pages: totalPages },
                    200,
                  );
                },
                onFailure: (err) => {
                  switch (err._tag) {
                    case "SearchNoResultError":
                      return c.json(
                        { message: `No results for "${err.query}"` },
                        404,
                      );
                    case "PageOutOfRangeError":
                      return c.json(
                        {
                          message: `Page ${err.page} is out of range (total: ${err.totalPages})`,
                        },
                        400,
                      );
                    case "SearchApiUnexpectedError":
                      switch (err.reason) {
                        case "rateLimit":
                          return c.json({ message: err.message }, 429);
                        case "validation":
                          return c.json({ message: err.message }, 400);
                        default:
                          return c.json({ message: err.message }, 500);
                      }
                    default:
                      return err satisfies never;
                  }
                },
              }),
            ),
        );
      },
    );
    return app;
  }),
}) {}
