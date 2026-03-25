import { Config, ConfigProvider, Effect } from "effect";
import { CompactSign, compactVerify } from "jose";

import { type NextRequest, NextResponse } from "next/server";

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
  // client_id cookie の JWS 署名・検証に使う鍵。未設定時（dev / CI）は "test-token" をデフォルト値とする
  const rawSecret = yield* Config.string("CLIENT_ID_SIGNING_SECRET").pipe(
    Config.withDefault("test-token"),
  );
  const signingSecret = new TextEncoder().encode(rawSecret);

  const proxy = async (request: NextRequest): Promise<NextResponse> => {
    // /api 以外はそのまま通す
    if (!request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    try {
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

// ── Proxy ──

export const proxy = Effect.runSync(
  proxyProgram.pipe(Effect.withConfigProvider(ConfigProvider.fromEnv())),
);

export const config = {
  matcher: "/api/:path*",
};
