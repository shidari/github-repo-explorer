import { Effect, Layer } from "effect";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EdgeRateLimitConfigTag, middlewareProgram } from "@/proxy";

function createTestMiddleware({
  windowMs,
  maxRequests,
}: {
  windowMs: number;
  maxRequests: number;
}) {
  return Effect.runSync(
    middlewareProgram.pipe(
      Effect.provide(
        Layer.succeed(EdgeRateLimitConfigTag, { windowMs, maxRequests }),
      ),
    ),
  );
}

function createRequest({ ip, path }: { ip: string; path: string }) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

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
