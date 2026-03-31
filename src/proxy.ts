import { Effect } from "effect";
import { proxyProgram } from "@/_proxyBuilder";
import { ChallengeRateLimit } from "@/infra/challenge-rate-limit";

export const proxy = Effect.runSync(
  proxyProgram.pipe(
    Effect.provide(
      process.env.NODE_ENV === "development"
        ? ChallengeRateLimit.noop
        : ChallengeRateLimit.main,
    ),
  ),
);

export const config = {
  matcher: "/api/:path*",
};
