# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19
- **Language**: TypeScript 5
- **API**: Hono + hono-openapi (Swagger UI)
- **Schema / Effect**: Effect TS
- **Linter / Formatter**: Biome 2.2
- **Database**: Kysely + PGlite (test) / Vercel Postgres (production)
- **Testing**: Vitest + FastCheck (PBT)
- **Component Catalog**: Storybook 10
- **Package Manager**: pnpm

## Getting Started

```bash
pnpm install
pnpm dev        # Next.js dev server (port 3000)
pnpm dev:api    # Hono API server (port 3001)
pnpm storybook  # Storybook (port 6006)
```

## Scripts

```bash
pnpm test          # テスト実行
pnpm type-check    # 型チェック
pnpm lint          # Biome lint
pnpm format        # Biome format
pnpm build         # プロダクションビルド
```
