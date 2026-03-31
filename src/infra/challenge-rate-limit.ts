import { Redis } from "@upstash/redis";
import { Config, Context, Data, Effect, Layer } from "effect";

export class ChallengeRateLimitError extends Data.TaggedError(
  "ChallengeRateLimitError",
)<{ readonly cause: unknown }> {}

// ── Challenge Rate Limit ──

export class ChallengeRateLimit extends Context.Tag("ChallengeRateLimit")<
  ChallengeRateLimit,
  { readonly acquire: () => Effect.Effect<boolean, ChallengeRateLimitError> }
>() {
  static readonly CHALLENGE_TTL_MIN_S = 3;
  static readonly CHALLENGE_TTL_MAX_S = 5;

  static challengeTtlMs() {
    const { CHALLENGE_TTL_MIN_S, CHALLENGE_TTL_MAX_S } = ChallengeRateLimit;
    return (
      (CHALLENGE_TTL_MIN_S +
        Math.random() * (CHALLENGE_TTL_MAX_S - CHALLENGE_TTL_MIN_S)) *
      1000
    );
  }

  static readonly main = Layer.effect(
    ChallengeRateLimit,
    Effect.gen(function* () {
      const url = yield* Config.string("KV_REST_API_URL");
      const token = yield* Config.string("KV_REST_API_TOKEN");
      const redis = new Redis({ url, token });

      return {
        acquire: () =>
          Effect.tryPromise({
            try: async () => {
              const result = await redis.set("challenge_lock", 1, {
                nx: true,
                px: Math.round(ChallengeRateLimit.challengeTtlMs()),
              });
              return result === "OK";
            },
            catch: (cause) => new ChallengeRateLimitError({ cause }),
          }),
      };
    }),
  );

  static readonly ci = Layer.effect(
    ChallengeRateLimit,
    Effect.gen(function* () {
      const url = yield* Config.string("CI_KV_REST_API_URL");
      const token = yield* Config.string("CI_KV_REST_API_TOKEN");
      const redis = new Redis({ url, token });

      return {
        acquire: () =>
          Effect.tryPromise({
            try: async () => {
              const result = await redis.set("challenge_lock", 1, {
                nx: true,
                px: Math.round(ChallengeRateLimit.challengeTtlMs()),
              });
              return result === "OK";
            },
            catch: (cause) => new ChallengeRateLimitError({ cause }),
          }),
      };
    }),
  );

  // dev 環境用: rate limit を無効化（Redis 不要）
  static readonly noop = Layer.succeed(ChallengeRateLimit, {
    acquire: () => Effect.succeed(true),
  });
}
