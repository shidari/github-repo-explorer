# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。

**デプロイ**: https://github-repo-explorer-eta.vercel.app

## 目次

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [工夫した点・こだわりポイント](#工夫した点こだわりポイント)
  - [フロントエンド](#フロントエンド)
    - 機能: 検索 / 詳細表示
    - 設計: 状態管理 / コンポーネント設計 / アクセシビリティ・デザイントークン
  - [BFF（API Layer）](#bffapi-layer)
    - 機能: リポジトリ検索 API / 詳細取得
    - 設計: アーキテクチャ（DDD + Layered） / レイヤーベース DI / Rate Limit
  - [テスト戦略](#テスト戦略)
- **AI 利用レポート**
  - [AI 利用レポート](#ai-利用レポート) — 利用方法 / AI が効果的だった領域 / 自分が判断した領域

## Tech Stack

| カテゴリ | 技術 |
|---------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + React Compiler |
| Language | TypeScript 5 |
| API Layer | Hono + hono-openapi |
| Client State | Jotai |
| Server State | SWR |
| Backend Core | Effect TS（Schema / Service / Layer） |
| Linter / Formatter | Biome 2.2 |
| Database | Kysely + PGlite (dev) / Vercel Postgres (prod) |
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

## 工夫した点・こだわりポイント

### フロントエンド

#### 検索

##### 機能実装

- Suspense を用いた debounce の実装（`UnsafeSingletonDebounce`）
  - `useDeferredValue` は UX の最適化はできるが API リクエスト抑制には使えないと判断し、固定 300ms の debounce を採用
  - Promise を throw して Suspense に suspend させることで、debounce 中は fallback を表示
  - シングルトンで状態管理しており複数インスタンスの同時使用は不可（`clearTimeout` が競合）
  - 複数コンポーネント対応（Map による管理等）も検討したが、現状1箇所のみのため制約を命名で明示して対処
- ページネーション
  - ページネーションと検索結果一覧の Suspense 境界を分離
  - ページ番号はスマート表示（前後1ページ + 先頭・末尾 + 省略記号）
  - GitHub Search API の1000件制限に対応し、最大50ページにキャップ
  - SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念
- スクロール復元
  - Jotai atom + `data-repo` 属性 + `scrollIntoView` で実装
  - Next.js 組み込みの scroll restoration が効かなかったため自前実装

##### UI/UX

- **Debounce（自動検索）**: 入力のたびに API を叩かないよう 300ms の debounce を採用。concurrent rendering により不整合のあるレンダリングを防止
- **ページネーション**
  - ページ移動時にページネーション UI 自体が消えないよう配慮
  - ページネーション連打で rate limit に引っかかる問題あり。現状は UI 上のエラーメッセージ表示で対応（リクエスト中の disabled 化は要調査）
  - 無限スクロールは GitHub REST API の仕様上複雑さが増すため不採用
- **スクロール復元**: 詳細ページから検索結果に戻ったとき、前回見ていた位置にスクロール復元

#### 詳細表示

- RSC でデータ取得: `page.tsx`（Server Component）でリポジトリクエリを直接実行
  - Client Component は scroll 復元の副作用のみ担当
- **高速表示**: RSC キャッシュ（10分）+ `Link prefetch={true}` で詳細ページへの遷移を最適化
  - リポジトリ情報が10分未満で更新されることは稀と判断し `revalidate = 600`。RSC による詳細取得は Rate Limit の対象外（GitHub API 直接）のため、キャッシュで呼び出しを抑制
  - RSC キャッシュがサーバー上で共有されるため、prefetch によるリクエスト増加は GitHub API への負荷に直結しないと判断
- Vercel のベストプラクティススキルによるレビューを経て追加:
  - 動的メタデータ（`generateMetadata`）
  - エラーページ（`error.tsx`, `global-error.tsx`, `not-found.tsx`）

#### 設計

##### 状態管理

| | クライアントステート | サーバーステート |
|---|---|---|
| **ライブラリ** | Jotai | SWR |
| **役割** | 検索クエリ・ページ番号・スクロール復元 | API レスポンスのキャッシュ・再取得 |
| **特徴** | インメモリで IO に依存しない | Suspense 対応・キャッシュ管理を委譲 |

- **Jotai**（クライアントステート）
  - session storage の代用として採用
    - session storage は hydration の問題が発生したため切り替え（要検証）
  - URL state（searchParams / useSearchParams）は不採用
    - searchParams が変わると Page 自体が再レンダリングされるため、入力のたびにページ全体が再描画され、自動検索 UI とは相性が悪い
    - 検索画面を共有するユースケースも一般的でないと判断
  - atom の getter/setter で状態間の依存関係を宣言的に記述
    - `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
    - `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
    - `lastVisitedRepoAtom`: 詳細ページで full_name をセット。検索結果に戻ったときの scroll 復元に使用
- **SWR**（サーバーステート）
  - Suspense が使える点と、クライアント側の server state キャッシュ管理を任せられる点から採用
    - Next.js と同じ Vercel 製でエコシステムを統一
  - Suspense はレンダリング最適化（fallback 表示 + concurrent rendering によるチラつき防止）のために使用
    - API エラーは fetcher が Result 型（`{ ok, data } | { ok, tag }`）を返すことでコンポーネント内でハンドリング
    - Error Boundary（`error.tsx`）はネットワーク断など fetch 自体の例外に対するフォールバック
  - 今回の要件に絞るため `revalidateOnFocus` / `revalidateOnReconnect` は無効化（仕様の簡略化）

##### コンポーネント設計

- **shadcn/ui** のデザインとコンポーネント設計をベースに、必要なコンポーネントを追加
  - Radix UI や Tailwind CSS は今回の要件では必要のない依存と判断し、CSS Modules で直接実装
  - 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離
- **Storybook** でコンポーネントを個別に検証
  - page.tsx 経由での検証は非効率と判断
  - カタログを先に作り、デザインと動きを検証してからページに組み込むプロセスで開発
  - Play function によるインタラクションテスト含む

##### アクセシビリティ・デザイントークン

Vercel 公開のベストプラクティススキル（`web-design-guidelines`, `building-components`）によるレビューに基づき改善:

- **アクセシビリティ**
  - キーボード操作: `:focus-visible` スタイル、Skip link
  - スクリーンリーダー: `aria-live`、`role="img"` + `aria-label`、`aria-hidden`
  - モーション: `prefers-reduced-motion` 対応
  - セマンティクス: `<main>` ランドマーク、`lang="ja"`
- **デザイントークン**: ハードコードされた26箇所の色を8つの CSS 変数に集約
  - テーマ変更時の影響範囲を限定
- **スタイル方針**: CSS Modules を採用
  - 必要のない依存を減らす目的
  - inline style は原則使用せず module.css に切り出し

---

## BFF（API Layer）

- 依存の切り替えを容易にし、結果・エラー・依存を型で表現して素直にロジックを書ける点から **Effect TS** を採用
- エラーを型付きでパターンマッチできるため、ハンドリングの漏れを防げるのも良かった

#### アーキテクチャ（DDD + Layered Architecture）

```
src/
├── domain/           # ドメインモデル（Effect Schema で定義）
├── repository/       # 外部データソースへのアクセス（Command パターン）
│   ├── query.ts      #   SearchReposQuery / GetRepoByFullNameQuery
│   └── mock.ts       #   Effect Schema の Arbitrary + faker-js でモックデータを生成（seed 固定で E2E と一致させる）
├── app/api/
│   └── _hono-app/    # API Routes（Hono + Effect Service）
│       ├── search.ts #   SearchApp: リクエスト検証・レスポンス整形
│       └── index.ts  #   レイヤーの組み立て・ルーティング
└── infra/            # DB 接続・マイグレーション
    └── migrations/   #   Kysely Migrator によるファイルベースマイグレーション（SQL in TS）
```

- **Domain 層**: Effect Schema でドメインモデルを定義
  - バリデーションと型推論を一元化
  - DTO（`dto.ts`）を別途作成し、各レイヤーがドメイン情報をどう使うかを明示
- **Repository 層**: GitHub API への接続とドメインモデルへの変換
  - Command パターン（AWS SDK v3 に着想）で操作単位にインターフェースを分割
    - Repository パターンのインターフェース肥大化を回避
  - `Tag` + `Layer` で抽象化し、本番（GitHub API）とテスト（モックデータ）をレイヤー切り替えで差し替え可能
  - エラーを API ごとに型付きで分類（`SearchApiUnexpectedError` / `ReposApiUnexpectedError`）
    - HTTP ステータスを `reason`（`rateLimit` / `validation` / `serviceUnavailable` / `unknown`）にマッピングし、上位層でのハンドリングを容易にした
- **API Routes 層**: Client Component から叩かれるものだけを Hono の API として実装
  - RSC で使うデータ取得は API を経由せず `repository/query` を直接呼び出す
  - OpenAPI スキーマの自動生成と Swagger UI を提供（開発環境のみ）
    - API の検証をフロントエンド経由で行うのは非効率と判断し、Swagger UI で手動検証

##### レイヤーベース DI

```
SearchReposQuery       .main ← GitHub API      / .test ← モックデータ
GetRepoByFullNameQuery .main ← GitHub API      / .test ← モックデータ
DB                     .main ← Vercel Postgres / .test ← PGlite
RateLimitConfigTag     .main ← 本番設定        / .test ← テスト設定
```

- `NODE_ENV === "production"` で全レイヤーを一括切り替え
- テスト時は GitHub API・外部 DB に依存せず動作
  - シード固定のモックデータとインメモリ DB（PGlite）を使用
  - Rate limit の閾値等もテスト用の値に差し替え可能
  - モックデータはレイヤー切り替えで E2E テストにもそのまま流用
- 開発時もモックデータを使うことで、GitHub API を極力叩かず rate limit を消費しない安全な開発が可能

##### マイグレーション

- Kysely の [Migrator](https://kysely.dev/docs/migrations) でファイルベースのスキーマ管理
  - `.ts` ファイル内に `sql` タグで SQL を記述（Vercel serverless 環境で `fs` が使えないため、静的 import で解決）
  - `up()` / `down()` 関数でロールバック可能
  - 実行済みマイグレーションは `kysely_migration` テーブルで管理し、未実行分のみ適用

##### Rate Limit

GitHub Search API 自体に rate limit がある（認証なし: 10req/min、認証あり: 30req/min）。外部サービスを使用する Web アプリを公開する以上、負荷対策は可能な限り厳密にやるべきと判断し、2段構えで実装した。

```
Client → [1段目: Edge proxy] → [2段目: Hono ミドルウェア] → GitHub API
              IP制限                   Token Bucket
            (インメモリ)             (Vercel Postgres)
```

| | 1段目: Edge proxy | 2段目: Hono ミドルウェア |
|---|---|---|
| **目的** | バーストリクエストの遮断 | GitHub API の rate limit 保護 |
| **方式** | IP ベース（30req/min） | Token bucket |
| **実行環境** | Next.js 16 `proxy.ts`（API ルートのみ） | Node.js Runtime |
| **ストレージ** | インメモリ | Vercel Postgres |
| **ストレージ選定理由** | 要件的に厳密さより手軽さを優先しインメモリを採用 | 無料で Vercel コンソールから管理可能 |

- 1段目をインメモリにした背景
  - API Routes ではサーバーの立ち上げコードを触れず、DB コネクションのライフサイクル管理ができないため、コネクションプールが溢れる恐れがある
- 通常利用では debounce + SWR キャッシュにより 10req/min 程度に収まると想定
  - バーストリクエストは1段目で遮断
- **Race Condition 対策**: 2段目の Token bucket は `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` で1つの SQL 文に集約
  - トークンの読み取り・計算・書き込みを原子的に実行し、同時リクエストによる race condition を防止
- **per-user + global の2層 Token Bucket**: ユーザーごとの公平性（per-user）と GitHub API quota の保護（global）を分離
  - per-user: Cookie 単位で1ユーザーの独占を防止
  - global: `client_id = "global"` の共有行でサーバー全体のリクエスト数を制限し、GitHub API の rate limit（認証あり: 30req/min）内に収める
  - 想定ケース:
    - 1人が連打 → per-user で制限（global は余裕あり）
    - 3人が同時に 10req/min ずつ → global で合計 30req/min に制限
    - 多数のユーザーが同時利用 → global が先に枯渇し、全ユーザーに 429。1人が使い切ると他ユーザーも影響を受けるが、per-user があるため1人の独占は防止される
- **per-user の限界**: Cookie ベースのため、curl 等のブラウザ以外のクライアントはリクエストのたびに新しい `client_id` が発行され、per-user 制限を回避できる
  - HTTP の範囲でリクエストの発信元を判別する手段はなく、根本的な解決には認証が必要
  - GitHub API quota の保護は global rate limit が担っており、最悪のケースはサイトの一時的な利用不可にとどまる（既知の制限）
- GitHub Search API の `total_count` は実際のヒット数（数千万件）を返すが、取得可能なのは最大1000件
  - `GITHUB_SEARCH_MAX_RESULTS = 1000` で `total_pages` をキャップし、アクセス不可能なページへの遷移を防止

---

## テスト戦略

| 層 | ツール | 対象 |
|---|--------|------|
| 統合 | Vitest | API Routes のリクエスト/レスポンス検証（レイヤーを差し替えて Hono アプリ全体をテスト） |
| プロパティベース | FastCheck | スキーマの変換は性質として記述しやすいため採用。Star 数の表示（1000 → 1.0k、1M+）等の境界値検証にも活用 |
| E2E | Playwright | 最低動作要件を仕様として fix し、ユーザーフローで検証。UI は未 fix のためテスト対象外（メンテコスト考慮） |
| コンポーネント | Storybook | UI コンポーネントの手動検証（カタログで状態パターンを確認） |

- CI（GitHub Actions）で check（lint + 型チェック + ユニットテスト）と E2E を並列実行
  - PR・main ブランチの両方で CI を回し、本番でエラーが起きにくい状態を維持
  - E2E はモックデータで動作するため、GitHub API の rate limit やネットワーク状態に依存しない

---

## AI 利用レポート

本プロジェクトでは **Claude Code**（Anthropic の CLI ツール）を全面的に活用した。

### 利用方法

- **設計・実装の対話的な進行**: 設計方針の議論 → 実装 → レビュー → 修正のサイクル
  - Claude Code がコードを書き、自分が方向性の判断・フィードバック・最終承認を行う分担
- **コミット・PR の自動化**: `.claude/commands/commit-and-pr.md` にワークフローを定義
  - pre-commit チェック → コミット → ブランチ作成 → Push → PR 作成を一貫して自動実行
  - PR の body も design doc として詳細に記述
- **ルール・規約の蓄積**: `.claude/rules/` に規約を定義し、会話をまたいで一貫した品質を維持
  - Conventional Commits、PR テンプレート、React Compiler ルール等
- **外部スキルによるコードレビュー**: Vercel 公開のベストプラクティススキル群で自動レビュー
  - `vercel-react-best-practices` — React/Next.js パフォーマンス最適化（62ルール）
  - `vercel-composition-patterns` — コンポーネント設計パターン
  - `next-best-practices` — Next.js 規約・エラーハンドリング・メタデータ
  - `web-design-guidelines` — アクセシビリティ・フォーカス管理・モーション
  - `building-components` — コンポーネント API 設計・型・data-slot

### AI が特に効果的だった領域

- **コンパイル → テスト → 修復のフィードバックループ**
  - 型チェック・lint → テスト → 失敗すれば原因特定・修正を自動で繰り返す
  - 設計さえしっかりしていれば、このループを回すだけで実装が完成するのが大きな利点
- **外部スキルによるレビュー**: ベストプラクティスのルール群でコードベース全体を網羅的にレビュー
  - 自分では見落としがちなアクセシビリティ属性やメタデータの不足を検出できた
- **反復作業の正確な実行**: data-slot 追加、型エクスポート、CSS 変数への一括置換など

### 自分が主に判断した領域

- **設計**: アーキテクチャ全般の意思決定
  - Effect TS の採用、レイヤーベース DI、CSS Modules の選択など
  - UX を考慮した設計判断
- **コードレビュー**: AI が書いたコードの意図と実装の整合性を確認
  - CSS や汎用 UI はステートを持たず外部とやり取りしないため、レビューを軽めにした
  - 全体を通して設計とレビューに最も時間を割いた
- **提案の取捨選択**: AI のレビュー提案のうち、読みやすさやプロジェクト規模に合わないものを却下
