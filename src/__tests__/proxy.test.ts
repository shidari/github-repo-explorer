import { ConfigProvider, Effect, Layer } from "effect";
import { CompactSign } from "jose";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EdgeRateLimitConfigTag,
  GlobalRateLimiter,
  proxyProgram,
} from "@/proxy";

function createTestMiddleware({
  windowMs,
  maxRequests,
  signingSecret = "test-token",
}: {
  windowMs: number;
  maxRequests: number;
  signingSecret?: string;
}) {
  return Effect.runSync(
    proxyProgram.pipe(
      Effect.provide(
        Layer.succeed(EdgeRateLimitConfigTag, { windowMs, maxRequests }),
      ),
      Effect.provide(GlobalRateLimiter.test),
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

async function createRequestWithCookie({
  ip,
  path,
  secret = "test-token",
}: {
  ip: string;
  path: string;
  secret?: string;
}) {
  const token = await createSignedToken(crypto.randomUUID(), secret);
  return new NextRequest(`http://localhost${path}`, {
    headers: {
      "x-forwarded-for": ip,
      cookie: `client_id=${token}`,
    },
  });
}

function createRequest({ ip, path }: { ip: string; path: string }) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("x-client-id 注入", () => {
  it("有効な JWS トークン cookie があれば x-client-id にそのまま使う", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
    });
    const existingId = "existing-client-id";
    const token = await createSignedToken(existingId, "test-token");
    const request = new NextRequest("http://localhost/api/search?q=react", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
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
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
    });
    const request = new NextRequest("http://localhost/api/search?q=react", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        cookie: "client_id=tampered-token",
      },
    });

    const response = await proxy(request);
    expect(response.status).toBe(500);
  });

  it("cookie がなければ 425 を返して set-cookie にセットする", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
    });
    const request = createRequest({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    const response = await proxy(request);
    expect(response.status).toBe(425);
    expect(response.headers.get("set-cookie")).toContain("client_id=");
  });
});

// NOTE: GlobalRateLimiter.test は in-memory 実装のため本番の Upstash Redis（fixedWindow）と
// 完全に一致しない。境界値付近の挙動に若干のズレが生じる可能性がある。
describe("Global rate limiter", () => {
  it("グローバル制限を超えたら 429 を返す", async () => {
    const proxy = Effect.runSync(
      proxyProgram.pipe(
        Effect.provide(
          Layer.succeed(EdgeRateLimitConfigTag, {
            windowMs: 60_000,
            maxRequests: 1_000,
          }),
        ),
        Effect.provide(
          Layer.succeed(GlobalRateLimiter, {
            limit: async () => false,
          }),
        ),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([["CLIENT_ID_SIGNING_SECRET", "test-token"]]),
          ),
        ),
      ),
    );
    const request = await createRequestWithCookie({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    expect((await proxy(request)).status).toBe(429);
  });
});

describe("Edge rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("制限内のリクエストは 200 を返す", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = await createRequestWithCookie({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    expect((await proxy(request)).status).toBe(200);
  });

  it("API Route 以外はスルーする", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 1,
    });
    const request1 = createRequest({ ip: "10.0.0.2", path: "/search" });
    const request2 = createRequest({ ip: "10.0.0.2", path: "/search" });

    expect((await proxy(request1)).status).toBe(200);
    expect((await proxy(request2)).status).toBe(200);
  });

  it("制限を超えたら 429 を返す", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = await createRequestWithCookie({
      ip: "10.0.0.3",
      path: "/api/search?q=react",
    });

    expect((await proxy(request)).status).toBe(200);
    expect((await proxy(request)).status).toBe(200);
    expect((await proxy(request)).status).toBe(429);
  });

  it("ウィンドウ経過後にカウントがリセットされる", async () => {
    const now = new Date("2026-01-01T00:00:00Z").getTime();
    vi.setSystemTime(now);

    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = await createRequestWithCookie({
      ip: "10.0.0.6",
      path: "/api/search?q=react",
    });

    expect((await proxy(request)).status).toBe(200);
    expect((await proxy(request)).status).toBe(200);
    expect((await proxy(request)).status).toBe(429);

    vi.setSystemTime(now + 1_001);

    expect((await proxy(request)).status).toBe(200);
  });

  it("異なる IP は別カウント", async () => {
    const proxy = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const requestA = await createRequestWithCookie({
      ip: "10.0.0.4",
      path: "/api/search?q=react",
    });
    const requestB = await createRequestWithCookie({
      ip: "10.0.0.5",
      path: "/api/search?q=react",
    });

    expect((await proxy(requestA)).status).toBe(200);
    expect((await proxy(requestA)).status).toBe(200);
    expect((await proxy(requestA)).status).toBe(429);
    expect((await proxy(requestB)).status).toBe(200);
  });
});
