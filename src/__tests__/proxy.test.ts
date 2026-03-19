import { ConfigProvider, Effect, Layer } from "effect";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EdgeRateLimitConfigTag, proxyProgram } from "@/proxy";

function createTestMiddleware({
  windowMs,
  maxRequests,
  internalToken = "",
}: {
  windowMs: number;
  maxRequests: number;
  internalToken?: string;
}) {
  return Effect.runSync(
    proxyProgram.pipe(
      Effect.provide(
        Layer.succeed(EdgeRateLimitConfigTag, { windowMs, maxRequests }),
      ),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map([["INTERNAL_API_TOKEN", internalToken]]),
        ),
      ),
    ),
  );
}

function createRequest({ ip, path }: { ip: string; path: string }) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

describe("x-internal-token 注入", () => {
  it("INTERNAL_API_TOKEN が x-internal-token としてリクエストに付与される", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
      internalToken: "test-secret",
    });
    const request = createRequest({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-request-x-internal-token")).toBe(
      "test-secret",
    );
  });
});

describe("x-client-id 注入", () => {
  it("cookie に client_id があれば x-client-id にそのまま使う", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
    });
    const existingId = "existing-client-id";
    const request = new NextRequest("http://localhost/api/search?q=react", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        cookie: `client_id=${existingId}`,
      },
    });

    const response = middleware(request);
    expect(response.headers.get("x-middleware-request-x-client-id")).toBe(
      existingId,
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("cookie に client_id がなければ新規発行して set-cookie にセットする", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 10,
    });
    const request = createRequest({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    const response = middleware(request);
    const clientId = response.headers.get("x-middleware-request-x-client-id");
    expect(clientId).toBeTruthy();
    expect(response.headers.get("set-cookie")).toContain(
      `client_id=${clientId}`,
    );
  });
});

describe("Edge rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("制限内のリクエストは 200 を返す", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = createRequest({
      ip: "10.0.0.1",
      path: "/api/search?q=react",
    });

    expect(middleware(request).status).toBe(200);
  });

  it("API Route 以外はスルーする", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 1,
    });
    const request1 = createRequest({ ip: "10.0.0.2", path: "/search" });
    const request2 = createRequest({ ip: "10.0.0.2", path: "/search" });

    expect(middleware(request1).status).toBe(200);
    expect(middleware(request2).status).toBe(200);
  });

  it("制限を超えたら 429 を返す", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = createRequest({
      ip: "10.0.0.3",
      path: "/api/search?q=react",
    });

    expect(middleware(request).status).toBe(200);
    expect(middleware(request).status).toBe(200);
    expect(middleware(request).status).toBe(429);
  });

  it("ウィンドウ経過後にカウントがリセットされる", () => {
    const now = new Date("2026-01-01T00:00:00Z").getTime();
    vi.setSystemTime(now);

    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const request = createRequest({
      ip: "10.0.0.6",
      path: "/api/search?q=react",
    });

    expect(middleware(request).status).toBe(200);
    expect(middleware(request).status).toBe(200);
    expect(middleware(request).status).toBe(429);

    vi.setSystemTime(now + 1_001);

    expect(middleware(request).status).toBe(200);
  });

  it("異なる IP は別カウント", () => {
    const middleware = createTestMiddleware({
      windowMs: 1_000,
      maxRequests: 2,
    });
    const requestA = createRequest({
      ip: "10.0.0.4",
      path: "/api/search?q=react",
    });
    const requestB = createRequest({
      ip: "10.0.0.5",
      path: "/api/search?q=react",
    });

    expect(middleware(requestA).status).toBe(200);
    expect(middleware(requestA).status).toBe(200);
    expect(middleware(requestA).status).toBe(429);
    expect(middleware(requestB).status).toBe(200);
  });
});
