import { Context, Effect, Layer } from "effect";
import type { MiddlewareHandler } from "hono";

// ── Config ──

export class InternalAuthConfigTag extends Context.Tag("InternalAuthConfig")<
  InternalAuthConfigTag,
  { token: string }
>() {
  static readonly main = Layer.effect(
    InternalAuthConfigTag,
    Effect.sync(() => ({ token: process.env.INTERNAL_API_TOKEN ?? "" })),
  );

  static readonly test = Layer.succeed(InternalAuthConfigTag, {
    token: "test-token",
  });
}

// ── Service ──

export class InternalAuthMiddleware extends Effect.Service<InternalAuthMiddleware>()(
  "InternalAuthMiddleware",
  {
    effect: Effect.gen(function* () {
      const { token: expectedToken } = yield* InternalAuthConfigTag;

      const middleware: MiddlewareHandler = async (c, next) => {
        const token = c.req.header("x-internal-token");
        if (!token || token !== expectedToken) {
          return c.json({ message: "Unauthorized" }, 401);
        }
        await next();
      };

      return { middleware };
    }),
  },
) {}
