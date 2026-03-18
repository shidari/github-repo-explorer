import { Context, Effect, Layer } from "effect";
import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sql } from "kysely";
import { DB } from "@/infra/db";

// ── Config ──

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

export class RateLimitConfigTag extends Context.Tag("RateLimitConfig")<
  RateLimitConfigTag,
  RateLimitConfig
>() {
  static readonly main = Layer.succeed(RateLimitConfigTag, {
    maxTokens: 10,
    refillRate: 0.5,
  });

  static readonly test = Layer.succeed(RateLimitConfigTag, {
    maxTokens: 3,
    refillRate: 0,
  });
}

// ── Service ──

export class RateLimitMiddleware extends Effect.Service<RateLimitMiddleware>()(
  "RateLimitMiddleware",
  {
    effect: Effect.gen(function* () {
      const { db } = yield* DB;
      const { maxTokens, refillRate } = yield* RateLimitConfigTag;

      const middleware: MiddlewareHandler = async (c, next) => {
        try {
          let clientId = getCookie(c, "client_id");
          if (!clientId) {
            clientId = crypto.randomUUID();
            setCookie(c, "client_id", clientId, {
              httpOnly: true,
              secure: true,
              sameSite: "Strict",
              maxAge: 60 * 60 * 24 * 365,
            });
          }

          // INSERT ... ON CONFLICT DO UPDATE ... RETURNING で
          // READ → COMPUTE → WRITE を1つの SQL 文にまとめ、Race Condition を防ぐ。
          // 新規クライアント: INSERT して tokens = maxTokens - 1 を返す
          // 既存クライアント: ON CONFLICT で UPDATE し、
          //   経過時間に応じてトークンを補充してから1つ消費した値を返す
          //
          // NOTE: テスト環境の PGlite は内部 mutex で全クエリを直列化するため、
          // 並行アクセスによる Race Condition の再現テストは不可能。
          // 本番の Vercel Postgres（マルチコネクション）でのみ効果がある。
          const result = await db
            .insertInto("token_buckets")
            .values({
              client_id: clientId,
              tokens: maxTokens - 1,
              last_refill: new Date(),
            })
            .onConflict((oc) =>
              oc.column("client_id").doUpdateSet({
                tokens: sql<number>`LEAST(
                  ${sql.ref("token_buckets.tokens")}
                    + EXTRACT(EPOCH FROM now() - ${sql.ref("token_buckets.last_refill")})
                    * ${refillRate},
                  ${maxTokens}
                ) - 1`,
                last_refill: sql`now()`,
              }),
            )
            .returning("tokens")
            .executeTakeFirstOrThrow();

          if (result.tokens < 0) {
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
