import { faker } from "@faker-js/faker";
import type { FastCheck } from "effect";

// domain.ts の annotations.arbitrary に渡す生成関数

const OWNERS = [
  "facebook",
  "vercel",
  "microsoft",
  "honojs",
  "Effect-TS",
  "google",
  "apple",
  "denoland",
  "vuejs",
  "sveltejs",
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
  "remix",
  "angular",
  "bun",
  "astro",
  "nuxt",
  "solid",
  "preact",
  "qwik",
  "fresh",
  "htmx",
] as const;
const DESCRIPTIONS = [
  "A library for building user interfaces.",
  "The React Framework",
  "TypeScript is JavaScript with syntax for types.",
  "Web framework built on Web Standards",
  undefined,
] as const;
const LANGUAGES = ["JavaScript", "TypeScript", "Rust", "Go", null] as const;
const LICENSES = [
  { key: "mit", name: "MIT License" },
  { key: "apache-2.0", name: "Apache License 2.0" },
  { key: "gpl-3.0", name: "GNU General Public License v3.0" },
  { key: "bsd-2-clause", name: "BSD 2-Clause License" },
  undefined,
] as const;
const TOPICS = [
  "typescript",
  "javascript",
  "react",
  "nodejs",
  "web",
  "api",
  "framework",
  "functional-programming",
  "effect",
  "open-source",
] as const;

export const mockHttpsUrl = () => (fc: typeof FastCheck) =>
  fc.constant(null).map(() => faker.internet.url({ protocol: "https" }));

export const mockAvatarUrl = () => (fc: typeof FastCheck) =>
  fc.constant(null).map(() => faker.image.avatar());

export const mockOwner = () => (fc: typeof FastCheck) =>
  fc.record({
    username: fc.constantFrom(...OWNERS),
    avatar_url: fc.constant(null).map(() => faker.image.avatar()),
  });

export const mockLicense = () => (fc: typeof FastCheck) =>
  fc.constantFrom(
    { key: "mit", name: "MIT License" },
    { key: "apache-2.0", name: "Apache License 2.0" },
    { key: "gpl-3.0", name: "GNU General Public License v3.0" },
    { key: "bsd-2-clause", name: "BSD 2-Clause License" },
  );

export const mockRepository = () => (fc: typeof FastCheck) =>
  fc
    .tuple(fc.constantFrom(...OWNERS), fc.constantFrom(...REPOS))
    .chain(([owner, repo]) =>
      fc.record({
        full_name: fc.constant(`${owner}/${repo}`),
        html_url: fc.constant(`https://github.com/${owner}/${repo}`),
        owner: fc.record({
          username: fc.constant(owner),
          avatar_url: fc.constant(null).map(() => faker.image.avatar()),
        }),
        description: fc.constantFrom(...DESCRIPTIONS),
        language: fc.constantFrom(...LANGUAGES),
        stargazers_count: fc.integer({ min: 0, max: 500000 }),
        watchers_count: fc.integer({ min: 0, max: 50000 }),
        forks_count: fc.integer({ min: 0, max: 100000 }),
        open_issues_count: fc.integer({ min: 0, max: 50000 }),
        topics: fc
          .subarray([...TOPICS], { minLength: 0, maxLength: 5 })
          .map((arr) => [...arr]),
        license: fc.constantFrom(...LICENSES),
        homepage: fc.constantFrom(
          undefined,
          "https://reactjs.org",
          "https://nextjs.org",
          "https://hono.dev",
        ),
        default_branch: fc.constantFrom("main", "master", "develop"),
        archived: fc.boolean(),
        created_at: fc.date({
          min: new Date("2015-01-01"),
          max: new Date("2024-01-01"),
        }),
        updated_at: fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2026-03-15"),
        }),
      }),
    );
