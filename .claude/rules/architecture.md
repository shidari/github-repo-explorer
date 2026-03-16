# アーキテクチャ

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 |
| UI | React 19 |
| Language | TypeScript 5 |
| Linter/Formatter | Biome 2.2 |
| Package Manager | pnpm |

## Directory Structure

| Directory | Role |
|-----------|------|
| `src/domain/` | ドメインモデル（Effect Schema） |
| `src/repository/` | 外部データソースへのアクセスとドメインモデルへの変換。CQRS で query / command を分離 |
| `src/app/` | Next.js App Router のページ・レイアウト・API ルート |
| `src/components/ui/` | 汎用 UI コンポーネント |
| `src/components/features/` | 機能固有のコンポーネント |
