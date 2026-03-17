import { Context, Effect, Layer } from "effect";

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

// ── Program ──

export const middlewareProgram = Effect.gen(function* () {
  const config = yield* EdgeRateLimitConfigTag;
  const counter = new Map<IP_ADDRESS, { count: number; resetAt: number }>();

  return (request: NextRequest): NextResponse => {
    if (!request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const now = Date.now();
    const entry = counter.get(ip);

    if (!entry || now > entry.resetAt) {
      counter.set(ip, { count: 1, resetAt: now + config.windowMs });
      return NextResponse.next();
    }

    counter.set(ip, { count: entry.count + 1, resetAt: entry.resetAt });

    if (entry.count + 1 > config.maxRequests) {
      return NextResponse.json(
        { message: "Too many requests" },
        { status: 429 },
      );
    }

    return NextResponse.next();
  };
});

const runnable = middlewareProgram.pipe(
  Effect.provide(EdgeRateLimitConfigTag.main),
);

// ── Proxy ──

export const proxy = Effect.runSync(runnable);

// NOTE: DB コネクションプールの枯渇を防ぐための IP ベース rate limit。
// Edge が複数ノードで動作する場合、ノード間でカウントが共有されず不完全（未検証）。
// 分散攻撃を想定し、単一ノードでも厳しめに制約をかけている（30req/min）。
// 想定ケース:
//   - 正当なユーザー: debounce + SWR キャッシュにより 10req/min 程度。問題なし
//   - 単一 IP からのバースト: 30req 超で 429。1 分後にリセット
//   - 複数ノードへの分散攻撃: 最悪 30 × ノード数が通過。Hono の token bucket が最終防御
// 完全な対策には Vercel KV（Redis）等の共有ストアが必要。
export const config = {
  matcher: "/api/:path*",
};
