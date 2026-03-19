import { Context, Effect, Layer } from "effect";
import type { MiddlewareHandler } from "hono";
import { sql } from "kysely";
import { DB } from "@/infra/db";

// ── Config ──

interface BucketConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface RateLimitConfig {
  /** ユーザーごとの公平性を保つための制限 */
  perUser: BucketConfig;
  /** GitHub API の quota を保護するためのサーバー全体の制限 */
  global: BucketConfig;
}

export class RateLimitConfigTag extends Context.Tag("RateLimitConfig")<
  RateLimitConfigTag,
  RateLimitConfig
>() {
  static readonly main = Layer.succeed(RateLimitConfigTag, {
    perUser: { maxTokens: 10, refillRate: 0.5 },
    global: { maxTokens: 30, refillRate: 0.5 },
  });

  static readonly test = Layer.succeed(RateLimitConfigTag, {
    perUser: { maxTokens: 3, refillRate: 0 },
    global: { maxTokens: 5, refillRate: 0 },
  });
}

// ── Service ──

export class RateLimitMiddleware extends Effect.Service<RateLimitMiddleware>()(
  "RateLimitMiddleware",
  {
    effect: Effect.gen(function* () {
      const { db } = yield* DB;
      const config = yield* RateLimitConfigTag;

      // INSERT ... ON CONFLICT DO UPDATE ... RETURNING で
      // READ → COMPUTE → WRITE を1つの SQL 文にまとめ、Race Condition を防ぐ。
      //
      // per-user 成功後に global で DB エラーが発生した場合、
      // per-user のトークンが1つ消費されたままになる（リクエストは通らないので実害なし）。
      //
      // NOTE: テスト環境の PGlite は内部 mutex で全クエリを直列化するため、
      // 並行アクセスによる Race Condition の再現テストは不可能。
      // 本番の Vercel Postgres（マルチコネクション）でのみ効果がある。
      const middleware: MiddlewareHandler = async (c, next) => {
        try {
          const clientId = c.req.header("x-client-id") ?? crypto.randomUUID();

          // per-user: ユーザーごとの公平性
          const userResult = await db
            .insertInto("token_buckets")
            .values({
              client_id: clientId,
              tokens: config.perUser.maxTokens - 1,
              last_refill: new Date(),
            })
            .onConflict((oc) =>
              oc.column("client_id").doUpdateSet({
                tokens: sql<number>`LEAST(
                  ${sql.ref("token_buckets.tokens")}
                    + EXTRACT(EPOCH FROM now() - ${sql.ref("token_buckets.last_refill")})
                    * ${config.perUser.refillRate},
                  ${config.perUser.maxTokens}
                ) - 1`,
                last_refill: sql`now()`,
              }),
            )
            .returning("tokens")
            .executeTakeFirstOrThrow();

          if (userResult.tokens < 0) {
            return c.json({ message: "Too many requests" }, 429);
          }

          // global: GitHub API の quota 保護（サーバー全体で共有）
          const globalResult = await db
            .insertInto("token_buckets")
            .values({
              client_id: "global",
              tokens: config.global.maxTokens - 1,
              last_refill: new Date(),
            })
            .onConflict((oc) =>
              oc.column("client_id").doUpdateSet({
                tokens: sql<number>`LEAST(
                  ${sql.ref("token_buckets.tokens")}
                    + EXTRACT(EPOCH FROM now() - ${sql.ref("token_buckets.last_refill")})
                    * ${config.global.refillRate},
                  ${config.global.maxTokens}
                ) - 1`,
                last_refill: sql`now()`,
              }),
            )
            .returning("tokens")
            .executeTakeFirstOrThrow();

          if (globalResult.tokens < 0) {
            return c.json({ message: "Too many requests" }, 429);
          }

          await next();
        } catch (err) {
          console.error("[RateLimitMiddleware] error:", err);
          return c.json({ message: "Internal server error" }, 500);
        }
      };

      return { middleware };
    }),
  },
) {}
