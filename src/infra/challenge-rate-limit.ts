import { Redis } from "@upstash/redis";
import { Config, Context, Data, Effect, Layer } from "effect";

export class ChallengeRateLimitError extends Data.TaggedError(
  "ChallengeRateLimitError",
)<{ readonly cause: unknown }> {}

// ── Redis Config ──

export class ChallengeRedisConfig extends Context.Tag("ChallengeRedisConfig")<
  ChallengeRedisConfig,
  { readonly url: string; readonly token: string }
>() {
  static readonly main = Layer.effect(
    ChallengeRedisConfig,
    Effect.gen(function* () {
      const url = yield* Config.string("KV_REST_API_URL");
      const token = yield* Config.string("KV_REST_API_TOKEN");
      return { url, token };
    }),
  );

  static readonly ci = Layer.effect(
    ChallengeRedisConfig,
    Effect.gen(function* () {
      const url = yield* Config.string("CI_KV_REST_API_URL");
      const token = yield* Config.string("CI_KV_REST_API_TOKEN");
      return { url, token };
    }),
  );
}

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
      const { url, token } = yield* ChallengeRedisConfig;
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

  // Redis 未設定時（E2E / ローカル開発）は常に許可
  static readonly noop = Layer.succeed(ChallengeRateLimit, {
    acquire: () => Effect.succeed(true),
  });
}
