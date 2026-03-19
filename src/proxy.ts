import { Config, ConfigProvider, Context, Effect, Layer } from "effect";

import { type NextRequest, NextResponse } from "next/server";

type IP_ADDRESS = string;

// ── Config ──

interface EdgeRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class EdgeRateLimitConfigTag extends Context.Tag("EdgeRateLimitConfig")<
  EdgeRateLimitConfigTag,
  EdgeRateLimitConfig
>() {
  static readonly main = Layer.succeed(EdgeRateLimitConfigTag, {
    windowMs: 60_000,
    maxRequests: 30,
  });
}

// ── ProxyProgram ──

export const proxyProgram = Effect.gen(function* () {
  const rateLimitConfig = yield* EdgeRateLimitConfigTag;
  // proxy を経由せず API Routes を直接叩くことを防ぐための x-internal-token
  const internalToken = yield* Config.string("INTERNAL_API_TOKEN").pipe(
    Config.withDefault(""),
  );

  const counter = new Map<IP_ADDRESS, { count: number; resetAt: number }>();

  const proxy = (request: NextRequest): NextResponse => {
    // /api 以外はそのまま通す
    if (!request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // IP ベースのバーストリクエストを遮断する。
    // NOTE: DB コネクションプールの枯渇を防ぐための IP ベース rate limit。
    // Edge が複数ノードで動作する場合、ノード間でカウントが共有されず不完全（未検証）。
    // 分散攻撃を想定し、単一ノードでも厳しめに制約をかけている（30req/min）。
    // 想定ケース:
    //   - 正当なユーザー: debounce + SWR キャッシュにより 10req/min 程度。問題なし
    //   - 単一 IP からのバースト: 30req 超で 429。1 分後にリセット
    //   - 複数ノードへの分散攻撃: 最悪 30 × ノード数が通過。Hono の token bucket が最終防御
    // 完全な対策には Vercel KV（Redis）等の共有ストアが必要。
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const ipRecord = counter.get(ip);

    const isExpired = !ipRecord || now > ipRecord.resetAt;
    if (isExpired) {
      counter.set(ip, { count: 1, resetAt: now + rateLimitConfig.windowMs });
    } else {
      counter.set(ip, { count: ipRecord.count + 1, resetAt: ipRecord.resetAt });
      if (ipRecord.count + 1 > rateLimitConfig.maxRequests) {
        return NextResponse.json(
          { message: "Too many requests" },
          { status: 429 },
        );
      }
    }

    // Hono 側が cookie に依存しないよう、client_id を x-client-id ヘッダーとして渡す
    const existingClientId = request.cookies.get("client_id")?.value;
    const clientId = existingClientId ?? crypto.randomUUID();

    const response = NextResponse.next({
      request: {
        headers: new Headers([
          ...request.headers,
          ["x-client-id", clientId],
          ["x-internal-token", internalToken],
        ]),
      },
    });

    if (!existingClientId) {
      response.cookies.set("client_id", clientId, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  };

  return proxy;
});

const runnable = proxyProgram.pipe(
  Effect.provide(EdgeRateLimitConfigTag.main),
  Effect.withConfigProvider(ConfigProvider.fromEnv()),
);

// ── Proxy ──

export const proxy = Effect.runSync(runnable);

export const proxyConfig = {
  matcher: "/api/:path*",
};
