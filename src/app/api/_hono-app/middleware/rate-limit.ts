import { Context, Effect, Layer } from "effect";
import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
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

        const now = new Date();

        const existing = await db
          .selectFrom("token_buckets")
          .select(["tokens", "last_refill"])
          .where("client_id", "=", clientId)
          .executeTakeFirst();

        if (!existing) {
          await db
            .insertInto("token_buckets")
            .values({
              client_id: clientId,
              tokens: maxTokens - 1,
              last_refill: now,
            })
            .execute();
          await next();
          return;
        }

        const elapsed = (now.getTime() - existing.last_refill.getTime()) / 1000;
        const refilled = Math.min(
          maxTokens,
          existing.tokens + elapsed * refillRate,
        );
        const remaining = refilled - 1;

        await db
          .updateTable("token_buckets")
          .set({ tokens: remaining, last_refill: now })
          .where("client_id", "=", clientId)
          .execute();

        if (remaining < 0) {
          return c.json({ message: "Too many requests" }, 429);
        }

        await next();
      };

      return { middleware };
    }),
  },
) {}
