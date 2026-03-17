# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。

**デプロイ**: https://github-repo-explorer-eta.vercel.app

## 目次

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- **工夫した点・こだわりポイント**
  - [フロントエンド](#フロントエンド)
    - 機能: 検索 / 詳細表示
    - 設計: 状態管理 / コンポーネント設計 / アクセシビリティ・デザイントークン
  - [BFF（API Layer）](#bffapi-layer)
    - 機能: リポジトリ検索 API / 詳細取得 / Rate Limit / GitHub API 制限対処
    - 設計: アーキテクチャ（DDD + Layered） / レイヤーベース DI
  - [テスト戦略](#テスト戦略)
- **AI 利用レポート**
  - [AI 利用レポート](#ai-利用レポート) — 利用方法 / AI が効果的だった領域 / 人間が判断した領域

## Tech Stack

| カテゴリ | 技術 |
|---------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + React Compiler |
| Language | TypeScript 5 |
| API Layer | Hono + hono-openapi |
| State | Jotai |
| Schema / Effect | Effect TS |
| Linter / Formatter | Biome 2.2 |
| Database | Kysely + PGlite (dev) / Vercel Postgres (prod)。型安全なクエリビルダーのため、型チェック → エラー修正のループを agentic coding で回しやすい |
| Testing | Vitest + FastCheck + Playwright |
| Component Catalog | Storybook 10 |
| Package Manager | pnpm |

## Getting Started

```bash
pnpm install
pnpm dev        # Next.js dev server (port 3000)
pnpm storybook  # Storybook (port 6006)
```

```bash
pnpm test          # Vitest ユニットテスト
pnpm type-check    # TypeScript 型チェック
pnpm lint          # Biome lint
pnpm build         # プロダクションビルド
```

---

## フロントエンド

### 検索機能

- **Debounce + Suspense 統合**: 目的は API リクエストの抑制のため、`useDeferredValue`（React スケジューラ任せで時間制御不可）ではなく固定 300ms の debounce を採用。さらに Suspense と統合し、Promise を throw して suspend させることで、チラつきの防止と concurrent rendering による UI 表示の最適化を実現した
- **ページネーション**: 上下2箇所に配置。ページ番号のスマート表示（前後1ページ + 先頭・末尾 + 省略記号）。GitHub Search API の1000件制限に対応し、最大50ページにキャップ。ページネーションと検索結果一覧の Suspense 境界を分離し、ページ移動時にページネーション自体が suspend しないようにして UX を改善。なお、SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念した
- **スクロール復元**: 現状の設計では Next.js 組み込みの scroll restoration が効かなかったため、自前で実装。Jotai の atom に訪問リポジトリを記録し、`data-repo` 属性で DOM 要素を特定して `scrollIntoView` する仕組み。直アクセス時は `searchQueryAtom` が空なので復元をスキップ

### 状態管理

session storage の代用として **Jotai** を採用。session storage は hydration の問題が発生したため（要検証）、インメモリなクライアントステートで IO に依存しない Jotai に切り替えた。API もシンプル。状態間の依存管理を素直に表現でき、イベントハンドラ経由ではなく atom の getter/setter で依存関係を宣言的に記述した。

- `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
- `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
- `lastVisitedRepoAtom`: 詳細ページで full_name をセット。検索結果に戻ったときの scroll 復元に使用

SWR は Suspense が使える点と、クライアント側の server state キャッシュ管理を任せられる点から採用。`revalidateOnFocus` / `revalidateOnReconnect` は無効化した。今回の要件に絞るための判断で、これを有効にするとページネーション周りの設計も変更が必要になりそうなため。

### 詳細表示

- **RSC でデータ取得**: `page.tsx`（Server Component）で Effect を実行し、GitHub API からリポジトリ情報を取得。Client Component は scroll 復元の副作用のみ担当
- 動的メタデータ（`generateMetadata`）、エラーページ（`error.tsx`, `global-error.tsx`, `not-found.tsx`）は Vercel のベストプラクティススキルによるレビューを経て追加

### コンポーネント設計

汎用 UI コンポーネント（`components/ui/`）は **shadcn/ui** のデザインとコンポーネント設計をベースにした。ただし Radix UI や Tailwind CSS は必要のない依存と判断し、CSS Modules で直接実装した。

- 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離
- **Storybook**: UI コンポーネントの検証を Next.js 開発サーバ経由でなく効率的に行うために採用。UI / feature コンポーネントのカタログを先に作り、デザインと動きを検証してからページに組み込むプロセスで開発した（Play function によるインタラクションテスト含む）

### アクセシビリティ・デザイントークン

Vercel 公開のベストプラクティススキル（`web-design-guidelines`, `building-components`）によるレビューに基づき改善：

- `:focus-visible` スタイル、`prefers-reduced-motion` 対応、`aria-live`、Skip link、`role="img"` + `aria-label`、`aria-hidden`、`<main>` ランドマーク、`lang="ja"` 等のアクセシビリティ対応
- ハードコードされた26箇所の色を8つの CSS 変数に集約し、テーマ変更時の影響範囲を限定
- スタイルは CSS Modules を採用。コンポーネントごとにスコープ化でき、必要のない依存を減らしたいため。コンポーネントと CSS は分離する方針で、inline style は原則使用せず module.css に切り出し

---

## BFF（API Layer）

依存の切り替えを容易にし、結果・エラー・依存を型で表現して素直にロジックを書ける点から **Effect TS** を採用。エラーを型付きでパターンマッチできるため、ハンドリングの漏れを防げるのも良かった。

### アーキテクチャ（DDD + Layered Architecture）

```
src/
├── domain/           # ドメインモデル（Effect Schema で定義）
├── repository/       # 外部データソースへのアクセス（CQRS: query / command）
│   ├── query.ts      #   SearchReposQuery / GetRepoByFullNameQuery
│   └── mock.ts       #   Effect Schema の Arbitrary + faker-js でモックデータを生成（seed 固定で E2E と一致させる）
├── app/api/
│   └── _hono-app/    # API Routes（Hono + Effect Service）
│       ├── search.ts #   SearchApp: リクエスト検証・レスポンス整形
│       └── index.ts  #   レイヤーの組み立て・ルーティング
└── infra/            # DB 接続等のインフラ層
```

- **Domain 層**: Effect Schema でリポジトリ・オーナー等のドメインモデルを定義。バリデーションと型推論を一元化。DTO（`dto.ts`）を別途作成し、ドメインモデルとの分離を明確にした。各レイヤーがドメイン情報をどう使うかを DTO で明示
- **Repository 層**: GitHub API への接続とドメインモデルへの変換。CQRS パターンで query / command を分離し、単一責務・インターフェースの肥大化防止・パフォーマンス最適化を考慮。事前にインターフェースを定義し、`Tag` + `Layer` で抽象化して、本番（GitHub API）とテスト（モックデータ）をレイヤー切り替えで差し替え可能
- **API Routes 層**: フロントエンド（Client Component）から叩かれるものだけを Hono の API として実装。RSC で使うデータ取得は API を経由せず `repository/query` を直接呼び出す。OpenAPI スキーマの自動生成と Swagger UI を提供（開発環境のみ）し、API 開発時は Swagger UI で手動検証を行った
### レイヤーベース DI

```
SearchReposQuery       .main ← GitHub API    / .test ← モックデータ
GetRepoByFullNameQuery .main ← GitHub API    / .test ← モックデータ
DB                     .main ← Vercel Postgres / .test ← PGlite
RateLimitConfigTag     .main ← 本番設定      / .test ← テスト設定
```

`NODE_ENV === "production"` で全レイヤーを一括切り替え。テスト時は GitHub API・外部 DB に依存せず、シード固定のモックデータとインメモリ DB で動作。この仕組みにより、Rate limit の閾値等もテスト用の値に差し替えてテストできた。また、モックデータはレイヤー切り替えで簡単に利用できるため、E2E テストにもそのまま流用した。開発時もモックデータを使うことで、GitHub API を極力叩かず rate limit を消費しない安全な開発が可能になった。
### Rate Limit

GitHub Search API 自体に rate limit がある（認証なし: 10req/min、認証あり: 30req/min）。外部サービスを使用する Web アプリを公開する以上、負荷対策は可能な限り厳密にやるべき。そのため2段構えで実装した。

- **Edge proxy（1段目）**: IP ベースのレートリミット（30req/min）。Next.js 16 の `proxy.ts` で API ルートにのみ適用。API Routes ではサーバーの立ち上げコードを触れないため DB コネクションのライフサイクル管理ができず、コネクションプールが溢れる恐れがある。そのためまず Edge proxy でインメモリのレートリミッターを設置した。インメモリにしたのは、外部 DB を使うと複雑さが増し、やりたいことに対して割に合わないため
- **Hono ミドルウェア（2段目）**: GitHub API を叩きすぎないための token bucket レートリミッター。Node.js Runtime で動作し、Vercel Postgres でカウンターを永続化（無料で使え、Vercel と同じコンソールで管理できるため選定）

通常の利用では debounce + SWR キャッシュにより 10req/min 程度に収まると想定。バーストリクエストは1段目で遮断。

### GitHub API 制限対処

- `total_count` は実際のヒット数（数千万件）を返すが、取得可能なのは最大1000件。`GITHUB_SEARCH_MAX_RESULTS = 1000` で `total_pages` をキャップし、アクセス不可能なページへの遷移を防止

---

## テスト戦略

| 層 | ツール | 対象 |
|---|--------|------|
| ユニット | Vitest | ドメインモデルのバリデーション |
| 統合 | Vitest | API Routes のリクエスト/レスポンス検証（レイヤーを差し替えて Hono アプリ全体をテスト） |
| プロパティベース | FastCheck | スキーマの変換は性質として記述しやすいため採用。Star 数の表示（1000 → 1.0k）等の境界値検証にも活用 |
| E2E | Playwright | 最低動作要件を仕様として fix し、ユーザーフローで検証。UI は未 fix のためテスト対象外（メンテコスト考慮） |
| コンポーネント | Storybook Play | UI コンポーネントのインタラクション（クリック、状態遷移） |

- CI（GitHub Actions）で check（lint + 型チェック + ユニットテスト）と E2E を並列実行
- PR・main ブランチの両方で CI を回し、最初からなるべく本番でエラーが起きないようにした
- E2E はモックデータで動作するため、GitHub API の rate limit やネットワーク状態に依存しない

---

## AI 利用レポート

本プロジェクトでは **Claude Code**（Anthropic の CLI ツール）を全面的に活用した。

### 利用方法

**設計・実装の対話的な進行**

各機能の要件を対話しながら、設計方針の議論 → 実装 → レビュー → 修正のサイクルを回した。Claude Code がコードを書き、人間が方向性の判断・フィードバック・最終承認を行う分担。

**コミット・PR の自動化**

`.claude/commands/commit-and-pr.md` にワークフローを定義し、pre-commit チェック（Biome lint + 型チェック）→ コミット → ブランチ作成 → Push → PR 作成を一貫して自動実行。PR の body も design doc として詳細に記述。

**スキルベースのコードレビュー**

Vercel 公開のベストプラクティススキル群を導入し、自動レビューを実施：

- `vercel-react-best-practices` — React/Next.js パフォーマンス最適化（62ルール）
- `vercel-composition-patterns` — コンポーネント設計パターン
- `next-best-practices` — Next.js 規約・エラーハンドリング・メタデータ
- `web-design-guidelines` — アクセシビリティ・フォーカス管理・モーション
- `building-components` — コンポーネント API 設計・型・data-slot

**ルール・規約の蓄積**

`.claude/rules/` に Conventional Commits、PR テンプレート、React Compiler ルール等を定義し、会話をまたいで一貫した品質を維持。

### AI が特に効果的だった領域

- **コンパイル → テスト → 修復のフィードバックループ**: コードを書いたら型チェック・lint を通し、エラーがあれば自動修復。通ったらテストを実行し、失敗すれば原因を特定して修正。設計さえしっかりしていれば、このループを回すだけで実装が完成するのが大きな利点だった
- **Vercel スキルによるレビュー**: ベストプラクティスのルール群を読み込ませ、コードベース全体を網羅的にレビュー。人間では見落としがちなアクセシビリティ属性やメタデータの不足を検出できた
- **反復作業の正確な実行**: 全 UI コンポーネントへの data-slot 追加、型エクスポート、CSS 変数への一括置換など

### 人間が判断した領域

- **設計**: Effect TS の採用、CQRS パターン、レイヤーベース DI、CSS Modules の選択など、アーキテクチャ全般の意思決定
- **コードレビュー**: AI が書いたコードは全て目を通し、意図と実装が合っているかを確認。全体を通して設計とレビューに最も時間を割いた
- **提案の取捨選択**: AI のレビュー提案のうち、読みやすさやプロジェクト規模に合わないものを却下（例: Server/Client Component の過度な分離、`useDeferredValue` による debounce 置き換え）
- **UX の判断**: API リクエスト抑制のための固定 debounce の必要性、スケルトンのデザイン、ホバーエフェクトの方向性
