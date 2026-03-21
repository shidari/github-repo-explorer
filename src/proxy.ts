import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Config, ConfigProvider, Context, Effect, Layer } from "effect";
import { CompactSign, compactVerify } from "jose";

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
    maxRequests: 20,
  });
}

// ── GlobalRateLimiter ──

export class GlobalRateLimiter extends Context.Tag("GlobalRateLimiter")<
  GlobalRateLimiter,
  { limit: () => Promise<boolean> }
>() {
  static readonly main = Layer.effect(
    GlobalRateLimiter,
    Effect.gen(function* () {
      const url = yield* Config.string("KV_REST_API_URL");
      const token = yield* Config.string("KV_REST_API_TOKEN");

      const ratelimit = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.fixedWindow(100, "1 m"),
        prefix: "global",
      });

      return {
        limit: async () => {
          const { success } = await ratelimit.limit("global");
          return success;
        },
      };
    }),
  );

  // テスト用: in-memory の固定ウィンドウ実装。
  // NOTE: 本番の Upstash Redis（fixedWindow）と完全に一致するわけではないため、
  // 境界値付近の挙動に若干のズレが生じる可能性がある。
  static readonly test = Layer.succeed(
    GlobalRateLimiter,
    (() => {
      const maxRequests = 100;
      let count = 0;
      let resetAt = Date.now() + 60_000;
      return {
        limit: async () => {
          const now = Date.now();
          if (now > resetAt) {
            count = 0;
            resetAt = now + 60_000;
          }
          count++;
          return count <= maxRequests;
        },
      };
    })(),
  );
}

// ── JWS helpers ──

async function signClientId(clientId: string, secret: Uint8Array) {
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
  const rateLimitConfig = yield* EdgeRateLimitConfigTag;
  const globalRateLimiter = yield* GlobalRateLimiter;
  // client_id cookie の JWS 署名・検証に使う鍵。未設定時（dev / CI）は "test-token" をデフォルト値とする
  const rawSecret = yield* Config.string("CLIENT_ID_SIGNING_SECRET").pipe(
    Config.withDefault("test-token"),
  );
  const signingSecret = new TextEncoder().encode(rawSecret);

  const counter = new Map<IP_ADDRESS, { count: number; resetAt: number }>();

  const proxy = async (request: NextRequest): Promise<NextResponse> => {
    // /api 以外はそのまま通す
    if (!request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    try {
      // グローバル rate limit チェック（Upstash Redis / KV）。
      // IP 偽装による per-IP 制限バイパスを防ぐための絶対的な上限。
      // 本番は GlobalRateLimiter.main（Upstash Redis）、dev / CI は testWithLimit(∞) が注入される。
      const globalAllowed = await globalRateLimiter.limit();
      if (!globalAllowed) {
        return NextResponse.json(
          { message: "Too many requests" },
          { status: 429 },
        );
      }

      // IP ベースのバーストリクエストを遮断する。
      // NOTE: DB コネクションプールの枯渇を防ぐための IP ベース rate limit。
      // Edge が複数ノードで動作する場合、ノード間でカウントが共有されず不完全（未検証）。
      // 分散攻撃を想定し、単一ノードでも厳しめに制約をかけている（20req/min）。
      // 想定ケース:
      //   - 正当なユーザー: debounce + SWR キャッシュにより 10req/min 程度。問題なし
      //   - 単一 IP からのバースト: 20req 超で 429。1 分後にリセット
      //   - 複数ノードへの分散攻撃: 最悪 20 × ノード数が通過。Hono の token bucket が最終防御
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
        const newCount = ipRecord.count + 1;
        counter.set(ip, { count: newCount, resetAt: ipRecord.resetAt });
        const isRateLimited = newCount > rateLimitConfig.maxRequests;
        if (isRateLimited) {
          return NextResponse.json(
            { message: "Too many requests" },
            { status: 429 },
          );
        }
      }

      // client_id cookie の JWS 署名を検証し、改ざんされていない場合のみ使い回す
      const clientId = request.cookies.get("client_id")?.value;

      // 初回訪問・シークレットブラウザ等、cookie がない場合は cookie を発行して再試行を要求する。
      // cookie を自動送信しないクライアント（curl 等）はここで弾かれ、per-client rate limit のバイパスを防ぐ。
      if (clientId === undefined) {
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

const runnable = proxyProgram.pipe(
  Effect.provide(EdgeRateLimitConfigTag.main),
  Effect.provide(
    process.env.NODE_ENV === "production"
      ? GlobalRateLimiter.main
      : GlobalRateLimiter.test,
  ),
  Effect.withConfigProvider(ConfigProvider.fromEnv()),
);

// ── Proxy ──

export const proxy = Effect.runSync(runnable);

export const config = {
  matcher: "/api/:path*",
};
