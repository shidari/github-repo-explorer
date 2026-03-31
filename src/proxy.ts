import { Config, ConfigProvider, Effect } from "effect";
import { CompactSign, compactVerify } from "jose";

import { type NextRequest, NextResponse } from "next/server";
import {
  ChallengeRateLimit,
  ChallengeRedisConfig,
} from "@/infra/challenge-rate-limit";

// ── JWS helpers ──

export async function signClientId(clientId: string, secret: Uint8Array) {
  return new CompactSign(new TextEncoder().encode(clientId))
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

async function verifyClientId(token: string, secret: Uint8Array) {
  const { payload } = await compactVerify(token, secret);
  return new TextDecoder().decode(payload);
}

// ── ProxyProgram ──

export const proxyProgram = Effect.gen(function* () {
  const rawSecret = yield* Config.string("CLIENT_ID_SIGNING_SECRET").pipe(
    Config.withDefault("test-token"),
  );
  const signingSecret = new TextEncoder().encode(rawSecret);

  const challengeRateLimit = yield* ChallengeRateLimit;

  const proxy = async (request: NextRequest): Promise<NextResponse> => {
    if (!request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    try {
      const clientId = request.cookies.get("client_id")?.value;

      if (clientId === undefined) {
        // チャレンジの同時実行数を制限（cookie 使い捨て攻撃対策）
        const allowed = await Effect.runPromise(
          challengeRateLimit.acquire().pipe(
            Effect.catchTag("ChallengeRateLimitError", (e) => {
              console.error("[ChallengeRateLimit]", e.cause);
              return Effect.succeed(false);
            }),
          ),
        );
        if (!allowed) {
          return NextResponse.json(
            { message: "Too Many Requests" },
            { status: 429 },
          );
        }

        const newId = crypto.randomUUID();
        const token = await signClientId(newId, signingSecret);
        const response = NextResponse.json(
          { message: "Please retry" },
          { status: 425 },
        );
        response.cookies.set("client_id", token, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 365,
        });
        return response;
      }

      const verifiedId = await verifyClientId(clientId, signingSecret);
      return NextResponse.next({
        request: {
          headers: new Headers([
            ...request.headers,
            ["x-client-id", verifiedId],
          ]),
        },
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { message: "Internal Server Error" },
        { status: 500 },
      );
    }
  };

  return proxy;
});

// ── Proxy ──

export const proxy = Effect.runSync(
  proxyProgram.pipe(
    Effect.provide(ChallengeRateLimit.main),
    Effect.provide(ChallengeRedisConfig.main),
    Effect.withConfigProvider(ConfigProvider.fromEnv()),
  ),
);

export const config = {
  matcher: "/api/:path*",
};
