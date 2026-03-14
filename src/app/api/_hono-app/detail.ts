import { Effect, Schema } from "effect";
import { Hono } from "hono";
import {
  describeRoute,
  validator as effectValidator,
  resolver,
} from "hono-openapi";
import { Repository } from "@/domain";
import { GetRepoByFullNameQuery } from "@/lib/github/query";

// ── リクエストスキーマ ──

const detailParamSchema = Schema.Struct({
  owner: Schema.String.annotations({ description: "リポジトリオーナー" }),
  repo: Schema.String.annotations({ description: "リポジトリ名" }),
});

// ── レスポンススキーマ ──

const errorResponseSchema = Schema.Struct({
  message: Schema.String,
});

// ── ルーティングスペック ──

const detailRoute = describeRoute({
  description: "Get repository detail by owner and repo name",
  responses: {
    "200": {
      description: "リポジトリ詳細",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(Repository)),
        },
      },
    },
    "404": {
      description: "リポジトリが見つからない",
      content: {
        "application/json": {
          schema: resolver(Schema.standardSchemaV1(errorResponseSchema)),
        },
      },
    },
  },
});

// ── 実装 ──

export class DetailApp extends Effect.Service<DetailApp>()("DetailApp", {
  effect: Effect.gen(function* () {
    const getRepoByFullNameQuery = yield* GetRepoByFullNameQuery;

    return new Hono().get(
      "/:owner/:repo",
      detailRoute,
      effectValidator("param", Schema.standardSchemaV1(detailParamSchema)),
      async (c) => {
        const { owner, repo } = c.req.valid("param");

        return await Effect.runPromise(
          getRepoByFullNameQuery.runAction({ owner, repo }).pipe(
            Effect.match({
              onSuccess: (data) => c.json(data),
              onFailure: (err) =>
                c.json(
                  { message: `${err.owner}/${err.repo} not found` },
                  404,
                ),
            }),
          ),
        );
      },
    );
  }),
}) {}
