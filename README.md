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

#### 機能

##### 検索

- **Debounce + Suspense 統合**
  - API リクエスト抑制のために Suspense を用いた debounce を設計
  - `useDeferredValue` は UX の最適化はできるが、API リクエスト周りの最適化は難しく用途に合わないと判断し、固定 300ms の debounce を採用
  - Promise を throw して suspend させることで、チラつきの防止と concurrent rendering による UI 表示の最適化を実現
  - シングルトンで状態管理しており複数インスタンスの同時使用は不可（`clearTimeout` が競合）。今後改良予定
  - 複数コンポーネントからの呼び出し対応も検討した（Map による管理等）が、現状1箇所からのみ使用しているため、コンポーネント名を `UnsafeSingletonDebounce` と仰々しくすることで制約を明示して対処
- **ページネーション**
  - GitHub REST API の仕様上、ページネーションの方が素直に実装できると判断。無限スクロールは UI 的にも API 的にも複雑さが増すため不採用
  - ページネーションと検索結果一覧の Suspense 境界を分離し、ページ移動時にページネーション自体が suspend しないよう UX を改善
  - GitHub Search API の1000件制限に対応し、最大50ページにキャップ
  - ページ番号はスマート表示（前後1ページ + 先頭・末尾 + 省略記号）。shadcn/ui のページネーションコンポーネントをベースに実装
  - SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念
  - ページネーション連打で rate limit に引っかかる問題に対し、現状は UI 上のエラーメッセージ表示で対応。本来はリクエスト中にページネーションを disabled にすべきだが、Suspense を複雑に組み合わせているため実現方法が見つかっていない（`useTransition` 等での対応も難しそう。要調査）
- **スクロール復元**
  - Jotai の atom に訪問リポジトリを記録し、`data-repo` 属性で DOM 要素を特定して `scrollIntoView` で復元
  - Next.js 組み込みの scroll restoration が現状の設計では効かなかったため自前で実装
  - 直アクセス時は `searchQueryAtom` が空なので復元をスキップ

##### 詳細表示

- RSC でデータ取得: `page.tsx`（Server Component）でリポジトリクエリを直接実行しデータを取得
  - Client Component は scroll 復元の副作用のみ担当
- **RSC キャッシュ（10分）**: Rate Limit は現在フロントエンドからの検索・ページネーション（Hono API 経由）のみをカバーしており、RSC による詳細取得は GitHub API を直接叩く。リポジトリ情報が10分未満で更新されることは稀という判断のもと、`revalidate = 600` でキャッシュして API 呼び出しを抑制
- **Link prefetch**: 検索結果から詳細ページへの遷移を最適化するため、`prefetch={true}` でフルページデータを事前取得。RSC キャッシュがサーバー上で共有されるため、prefetch によるリクエスト増加は GitHub API への負荷に直結しないと判断
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
  - session storage の代用として採用（session storage は hydration の問題が発生したため切り替え。要検証）
  - URL state（searchParams / useSearchParams）は不採用。searchParams が変わると Page 自体が再レンダリングされるため、入力のたびにページ全体が再描画され、自動検索 UI とは相性が悪い。検索画面を共有するユースケースも一般的でないと判断
  - 状態間の依存管理を素直に表現でき、イベントハンドラ経由でなく atom の getter/setter で依存関係を宣言的に記述
  - atom 構成:
    - `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
    - `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
    - `lastVisitedRepoAtom`: 詳細ページで full_name をセット。検索結果に戻ったときの scroll 復元に使用
- **SWR**（サーバーステート）
  - Suspense が使える点と、クライアント側の server state キャッシュ管理を任せられる点から採用
  - Suspense のエラーは Error Boundary で補足すればよく、明示的なエラーハンドリングが不要
  - Next.js と同じ Vercel 製でエコシステムを統一
  - 今回の要件に絞るため `revalidateOnFocus` / `revalidateOnReconnect` は無効化（仕様の簡略化）

##### コンポーネント設計

- **shadcn/ui** のデザインとコンポーネント設計をベースにして、必要なコンポーネントを追加
  - Radix UI や Tailwind CSS は今回の要件では必要のない依存と判断し、CSS Modules で直接実装
- 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離
- **Storybook**: コンポーネントの挙動検証を page.tsx 経由で行うのは非効率と判断し、Storybook で個別に検証
  - UI / feature コンポーネントのカタログを先に作り、デザインと動きを検証してからページに組み込むプロセスで開発
  - Play function によるインタラクションテスト含む

##### アクセシビリティ・デザイントークン

Vercel 公開のベストプラクティススキル（`web-design-guidelines`, `building-components`）によるレビューに基づき改善:

- アクセシビリティ:
  - `:focus-visible` スタイル、`prefers-reduced-motion` 対応
  - `aria-live`、Skip link、`role="img"` + `aria-label`、`aria-hidden`
  - `<main>` ランドマーク、`lang="ja"`
- デザイントークン:
  - ハードコードされた26箇所の色を8つの CSS 変数に集約し、テーマ変更時の影響範囲を限定
- スタイル方針:
  - 必要のない依存を減らしたいので CSS Modules を採用
  - コンポーネントと CSS は分離する方針で、inline style は原則使用せず module.css に切り出し

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
└── infra/            # DB 接続等のインフラ層
```

- **Domain 層**
  - Effect Schema でリポジトリ・オーナー等のドメインモデルを定義
  - バリデーションと型推論を一元化
  - DTO（`dto.ts`）を別途作成し、ドメインモデルとの分離・依存関係を明確にした
  - 各レイヤーがドメイン情報をどう使うかを DTO で明示
- **Repository 層**
  - GitHub API への接続とドメインモデルへの変換
  - Repository パターンのインターフェース肥大化を避けるため、Command パターン（AWS SDK v3 に着想）で操作単位にインターフェースを分割
  - `Tag` + `Layer` で抽象化し、本番（GitHub API）とテスト（モックデータ）をレイヤー切り替えで差し替え可能
  - GitHub API のエラーを API ごとに型付きで分類（`SearchApiUnexpectedError` / `ReposApiUnexpectedError`）。HTTP ステータスを `reason`（`rateLimit` / `validation` / `serviceUnavailable` / `unknown`）にマッピングし、上位層でのハンドリングを容易にした
- **API Routes 層**
  - フロントエンド（Client Component）から叩かれるものだけを Hono の API として実装
  - RSC で使うデータ取得は API を経由せず `repository/query` を直接呼び出す
  - OpenAPI スキーマの自動生成と Swagger UI を提供（開発環境のみ）
  - API の検証をフロントエンド経由で行うのは非効率と判断し、Swagger UI で手動検証を行いつつ開発

##### レイヤーベース DI

```
SearchReposQuery       .main ← GitHub API      / .test ← モックデータ
GetRepoByFullNameQuery .main ← GitHub API      / .test ← モックデータ
DB                     .main ← Vercel Postgres / .test ← PGlite
RateLimitConfigTag     .main ← 本番設定        / .test ← テスト設定
```

- `NODE_ENV === "production"` で全レイヤーを一括切り替え
- テスト時は GitHub API・外部 DB に依存せず、シード固定のモックデータとインメモリ DB で動作
- Rate limit の閾値等もテスト用の値に差し替えてテスト可能
- モックデータはレイヤー切り替えで簡単に利用できるため、E2E テストにもそのまま流用
- 開発時もモックデータを使うことで、GitHub API を極力叩かず rate limit を消費しない安全な開発が可能

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

- 1段目をインメモリにした背景: API Routes ではサーバーの立ち上げコードを触れず、DB コネクションのライフサイクル管理ができないため、コネクションプールが溢れる恐れがある
- 通常の利用では debounce + SWR キャッシュにより 10req/min 程度に収まると想定。バーストリクエストは1段目で遮断
- GitHub Search API の `total_count` は実際のヒット数（数千万件）を返すが、取得可能なのは最大1000件。`GITHUB_SEARCH_MAX_RESULTS = 1000` で `total_pages` をキャップし、アクセス不可能なページへの遷移を防止

---

## テスト戦略

| 層 | ツール | 対象 |
|---|--------|------|
| 統合 | Vitest | API Routes のリクエスト/レスポンス検証（レイヤーを差し替えて Hono アプリ全体をテスト） |
| プロパティベース | FastCheck | スキーマの変換は性質として記述しやすいため採用。Star 数の表示（1000 → 1.0k、1M+）等の境界値検証にも活用 |
| E2E | Playwright | 最低動作要件を仕様として fix し、ユーザーフローで検証。UI は未 fix のためテスト対象外（メンテコスト考慮） |
| コンポーネント | Storybook | UI コンポーネントの手動検証（カタログで状態パターンを確認） |

- CI（GitHub Actions）で check（lint + 型チェック + ユニットテスト）と E2E を並列実行
- PR・main ブランチの両方で CI を回し、最初からなるべく本番でエラーが起きないようにした
- E2E はモックデータで動作するため、GitHub API の rate limit やネットワーク状態に依存しない

---

## AI 利用レポート

本プロジェクトでは **Claude Code**（Anthropic の CLI ツール）を全面的に活用した。

### 利用方法

- **設計・実装の対話的な進行**
  - 各機能の要件を対話しながら、設計方針の議論 → 実装 → レビュー → 修正のサイクルを回した
  - Claude Code がコードを書き、自分が方向性の判断・フィードバック・最終承認を行う分担
- **コミット・PR の自動化**
  - `.claude/commands/commit-and-pr.md` にワークフローを定義
  - pre-commit チェック（Biome lint + 型チェック）→ コミット → ブランチ作成 → Push → PR 作成を一貫して自動実行
  - PR の body も design doc として詳細に記述
- **ルール・規約の蓄積**
  - `.claude/rules/` に Conventional Commits、PR テンプレート、React Compiler ルール等を定義
  - 会話をまたいで一貫した品質を維持
- **外部スキルによるコードレビュー**
  - Vercel 公開のベストプラクティススキル群を導入し、自動レビューを実施:
    - `vercel-react-best-practices` — React/Next.js パフォーマンス最適化（62ルール）
    - `vercel-composition-patterns` — コンポーネント設計パターン
    - `next-best-practices` — Next.js 規約・エラーハンドリング・メタデータ
    - `web-design-guidelines` — アクセシビリティ・フォーカス管理・モーション
    - `building-components` — コンポーネント API 設計・型・data-slot

### AI が特に効果的だった領域

- **コンパイル → テスト → 修復のフィードバックループ**
  - コードを書いたら型チェック・lint を通し、エラーがあれば自動修復
  - 通ったらテストを実行し、失敗すれば原因を特定して修正
  - 設計さえしっかりしていれば、このループを回すだけで実装が完成するのが大きな利点
- **外部スキルによるレビュー**
  - ベストプラクティスのルール群を読み込ませ、コードベース全体を網羅的にレビュー
  - 自分では見落としがちなアクセシビリティ属性やメタデータの不足を検出できた
- **反復作業の正確な実行**
  - 全 UI コンポーネントへの data-slot 追加、型エクスポート、CSS 変数への一括置換など

### 自分が主に判断した領域

- **設計**
  - Effect TS の採用、CQRS パターン、レイヤーベース DI、CSS Modules の選択など、アーキテクチャ全般の意思決定
  - UX を考慮した設計判断
- **コードレビュー**
  - AI が書いたコードは基本的に目を通し、意図と実装が合っているかを確認
  - CSS や汎用 UI はステートを持たず（一部例外あり）、外部とやり取りを行わない。最悪全面書き換えも可能なため、レビューを軽めにした
  - 全体を通して設計とレビューに最も時間を割いた
- **提案の取捨選択**
  - AI のレビュー提案のうち、読みやすさやプロジェクト規模に合わないものを却下
