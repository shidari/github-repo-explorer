import { faker } from "@faker-js/faker";
import type { FastCheck } from "effect";

// domain.ts の annotations.arbitrary に渡す生成関数

export const mockAvatarUrl = () => (fc: typeof FastCheck) =>
  fc.constant(null).map(() => faker.image.avatar());

export const mockOwner = () => (fc: typeof FastCheck) =>
  fc.record({
    username: fc.constantFrom(
      "facebook",
      "vercel",
      "microsoft",
      "honojs",
      "Effect-TS",
    ),
    avatar_url: fc.constant(null).map(() => faker.image.avatar()),
  });

const OWNERS = [
  "facebook",
  "vercel",
  "microsoft",
  "honojs",
  "Effect-TS",
] as const;
const REPOS = [
  "react",
  "next.js",
  "typescript",
  "hono",
  "effect",
  "vue",
  "svelte",
  "vite",
  "node",
  "deno",
] as const;
const DESCRIPTIONS = [
  "A library for building user interfaces.",
  "The React Framework",
  "TypeScript is JavaScript with syntax for types.",
  "Web framework built on Web Standards",
  null,
] as const;
const LANGUAGES = ["JavaScript", "TypeScript", "Rust", "Go", null] as const;

export const mockRepository = () => (fc: typeof FastCheck) =>
  fc.record({
    full_name: fc
      .tuple(fc.constantFrom(...OWNERS), fc.constantFrom(...REPOS))
      .map(([owner, repo]) => `${owner}/${repo}`),
    owner: fc.record({
      username: fc.constantFrom(...OWNERS),
      avatar_url: fc.constant(null).map(() => faker.image.avatar()),
    }),
    description: fc.constantFrom(...DESCRIPTIONS),
    language: fc.constantFrom(...LANGUAGES),
    stargazers_count: fc.integer({ min: 0, max: 500000 }),
    watchers_count: fc.integer({ min: 0, max: 50000 }),
    forks_count: fc.integer({ min: 0, max: 100000 }),
    open_issues_count: fc.integer({ min: 0, max: 50000 }),
    updated_at: fc.date({
      min: new Date("2020-01-01"),
      max: new Date("2026-03-15"),
    }),
  });
