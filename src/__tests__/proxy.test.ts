import { ConfigProvider, Effect } from "effect";
import { CompactSign } from "jose";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxyProgram } from "@/proxy";

function createTestProxy(signingSecret = "test-token") {
  return Effect.runSync(
    proxyProgram.pipe(
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map([["CLIENT_ID_SIGNING_SECRET", signingSecret]]),
        ),
      ),
    ),
  );
}

async function createSignedToken(
  clientId: string,
  secret: string,
): Promise<string> {
  return new CompactSign(new TextEncoder().encode(clientId))
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(secret));
}

function createRequest({ path }: { path: string }) {
  return new NextRequest(`http://localhost${path}`);
}

describe("JWS cookie チャレンジ", () => {
  it("有効な JWS トークン cookie があれば x-client-id にそのまま使う", async () => {
    const proxy = createTestProxy();
    const existingId = "existing-client-id";
    const token = await createSignedToken(existingId, "test-token");
    const request = new NextRequest("http://localhost/api/search?q=react", {
      headers: {
        cookie: `client_id=${token}`,
      },
    });

    const response = await proxy(request);
    expect(response.headers.get("x-middleware-request-x-client-id")).toBe(
      existingId,
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("署名が不正な cookie は 500 を返す", async () => {
    const proxy = createTestProxy();
    const request = new NextRequest("http://localhost/api/search?q=react", {
      headers: {
        cookie: "client_id=tampered-token",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(500);
  });

  it("cookie がなければ 425 を返して set-cookie にセットする", async () => {
    const proxy = createTestProxy();
    const request = createRequest({ path: "/api/search?q=react" });

    const response = await proxy(request);
    expect(response.status).toBe(425);
    expect(response.headers.get("set-cookie")).toContain("client_id=");
  });

  it("API Route 以外はスルーする", async () => {
    const proxy = createTestProxy();
    const request = createRequest({ path: "/search" });

    const response = await proxy(request);
    expect(response.status).toBe(200);
  });
});
