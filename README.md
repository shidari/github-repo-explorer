# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。

**デプロイ**: https://github-repo-explorer-eta.vercel.app

## 目次

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [機能](#機能)
  - [フロントエンド](#フロントエンド)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-機能フロントエンド)
  - [API Layer](#api-layer)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-機能api-layer)
- [設計](#設計)
  - [フロントエンド設計](#フロントエンド設計)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-設計フロントエンド)
  - [API Layer 設計](#api-layer-設計)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-設計api-layer)
- [テスト](#テスト)
  - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-テスト)
- [AI 利用レポート](#ai-利用レポート)

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

## 機能

### フロントエンド

#### 検索

- 検索
  - キーワード入力による自動検索（debounce 300ms でリクエスト抑制）
- ページネーション
  - GitHub Search API の1000件制限に対応し、最大50ページにキャップ
  - 無限スクロールは GitHub REST API の仕様上複雑さが増すため不採用
- スクロール復元
  - 詳細ページから検索結果に戻ったとき、前回見ていたリポジトリの位置に自動スクロール
  - Jotai atom + `data-repo` 属性 + `scrollIntoView` で実装
  - Next.js 組み込みの scroll restoration が効かなかったため自前実装

<a id="工夫した点こだわりポイント-機能フロントエンド"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Suspense を活用した debounce**
   - Promise を throw して Suspense に suspend させ、debounce 中は fallback を表示
   - `useDeferredValue` は UX 最適化のみで API リクエスト抑制には使えないと判断し、固定 300ms を採用
   - デメリット: シングルトンのため複数インスタンスの同時使用は不可（`clearTimeout` が競合）
     - 複数コンポーネント対応（Map 管理等）も検討したが、現状1箇所のみのため制約を命名で明示して対処
2. **Suspense 境界の分離**
   - 検索結果とページネーションの境界を分離し、ページ移動時にページネーション UI が消えないよう改善
3. **スクロール復元の自前実装**
   - Jotai atom + `data-repo` 属性 + `scrollIntoView` で実装
   - Next.js 組み込みの scroll restoration が効かなかったため
4. **未解決の課題**
   - SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念
   - ページネーション連打で rate limit に引っかかる問題あり。現状は UI 上のエラーメッセージ表示で対応（リクエスト中の disabled 化は要調査）

</details>

#### 詳細表示

- 詳細情報の表示
  - リポジトリの README、スター数、言語などを表示

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **RSC + prefetch + キャッシュで遷移を高速化**
   - `page.tsx`（Server Component）でリポジトリクエリを直接実行し、不要な JS をクライアントに送らない
   - `Link prefetch={true}` で詳細ページを事前読み込み
   - リポジトリ情報が10分未満で更新されることは稀と判断し `revalidate = 600`
   - RSC による詳細取得は Rate Limit の対象外（GitHub API 直接）のため、キャッシュで呼び出しを抑制
   - RSC キャッシュがサーバー上で共有されるため、prefetch が GitHub API 負荷に直結しないと判断

</details>

#### フロントエンド共通

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **動的メタデータ**
   - `generateMetadata` で OGP 対応のメタデータを生成
2. **エラー・Not Found ページ**
   - `error.tsx`, `global-error.tsx`, `not-found.tsx` でユーザーが行き止まりにならないよう配慮

</details>

---

### API Layer

- GitHub Search API をラップしたリポジトリ検索エンドポイントを API Routes で作成
- RSC で `repository/query` を直接呼び出す詳細取得（API Routes を経由しない）
- API Routes の OpenAPI スキーマの自動生成と Swagger UI（開発環境のみ）
- JWS cookie チャレンジ（proxy）+ Token Bucket Rate Limit（Hono ミドルウェア）

<a id="工夫した点こだわりポイント-機能api-layer"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Effect TS の採用**
   - 結果・エラー・依存を型で表現し、エラーをパターンマッチできるためハンドリングの漏れを防止
2. **RSC と API Routes の使い分け**
   - クライアントから叩かれるものだけを Hono の API として実装し、RSC は `repository/query` を直接呼び出すことで不要なラウンドトリップを排除
3. **Swagger UI で API を直接検証**
   - フロントエンド経由での検証は非効率と判断
4. **JWS cookie チャレンジ + Token Bucket で負荷対策と公平性を確保**
   - GitHub Search API 自体に rate limit がある（認証なし: 10req/min、認証あり: 30req/min）
   - Token Bucket で全体の負荷を抑えつつ、per-user 制限で1人が使い切って他ユーザーが使えなくなることを防止

   ```mermaid
   sequenceDiagram
       participant C as Client (Browser / curl)
       participant P as proxy.ts (Edge)
       participant H as Hono (API Routes)
       participant G as GitHub API

       C->>P: GET /api/search?q=react
       alt cookie なし
           P-->>C: 425 + Set-Cookie: client_id=<JWS>
           C->>P: GET /api/search?q=react (cookie 付き)
       else 署名不正
           P-->>C: 500
       end
       P->>P: JWS 署名検証 → UUID 取り出し
       P->>H: GET /api/search (x-client-id: <uuid>)
       H->>H: Token bucket チェック (Postgres)
       H->>G: GitHub Search API
       G-->>H: 結果
       H-->>C: 200 JSON
   ```

</details>

---

## 設計

### フロントエンド設計

#### 状態管理

| | クライアントステート | サーバーステート |
|---|---|---|
| **ライブラリ** | Jotai | SWR |
| **役割** | 検索クエリ・ページ番号・スクロール復元 | API レスポンスのキャッシュ・再取得 |
| **任せたいこと** | ページ単位のインメモリなグローバル状態管理 | Suspense 対応のキャッシュ・再取得管理 |

<a id="工夫した点こだわりポイント-設計フロントエンド"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Jotai でセッション情報に近い状態を管理**
   - 当初は session storage を検討したが、hydration の問題が発生したためインメモリに切り替え（要検証）
   - URL state は不採用
     - `searchParams` は Page の再レンダリングを引き起こす可能性があり、自動検索 UI と相性が悪いと判断（要検証）
     - `useSearchParams` なら回避できそうだが、検索状態を URL で管理する必然性が薄い
     - Jotai の atom で依存関係を宣言的に記述する方が見通しが良い
   - atom の writer/reader で状態間の依存関係を記述
     - `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
     - `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
     - `lastVisitedRepoAtom`: 詳細ページで full_name をセット
2. **SWR で Suspense 対応のキャッシュ管理を委譲**
   - Suspense が使える点と、server state のキャッシュ管理を任せられる点から採用
   - Next.js と同じ Vercel 製でエコシステムを統一
   - `revalidateOnFocus` / `revalidateOnReconnect` は無効化（仕様の簡略化）
   - Suspense で不要なレンダリングやレンダリング結果の不整合をなくし表示を最適化

</details>

#### コンポーネント設計

- 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離
  - shadcn/ui のデザインとコンポーネント設計をベースに、必要なコンポーネントを追加
    - 今回の要件は CSS Modules で対応できると判断し、Radix UI や Tailwind CSS は不必要な依存として追加しない戦略
    - `next/image` による Image Optimization は `components/ui/` が Next.js に依存する形になるため見送り
  - ドメインが絡むコンポーネントは `components/features/` 内で作成

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **shadcn/ui の依存をそのまま引き継がない**
   - shadcn/ui は Radix UI + Tailwind CSS に依存しているが、なるべく依存は少ない方向にしたいためコンポーネントは直書き、CSS は CSS Modules を採用
2. **Storybook でコンポーネント単体検証**
   - page.tsx だと他の要因が絡むため、コンポーネントの検証だけを行える環境が必要と判断
   - カタログを先に作り、デザインと動きを検証してからページに組み込むプロセスで開発

</details>

#### アクセシビリティ・デザイントークン

Vercel 公開のベストプラクティススキル（`web-design-guidelines`, `building-components`）によるレビューに基づき改善:

- **アクセシビリティ**
  - キーボード操作: `:focus-visible` スタイル、Skip link
  - スクリーンリーダー: `aria-live`、`role="img"` + `aria-label`、`aria-hidden`
  - モーション: `prefers-reduced-motion` 対応
  - セマンティクス: `<main>` ランドマーク、`lang="ja"`
- **デザイントークン**: ハードコードされた26箇所の色を8つの CSS 変数に集約
  - テーマ変更時の影響範囲を限定
  - CSS Modules を採用（必要のない依存を減らす目的）
  - inline style は原則使用せず module.css に切り出し

---

### API Layer 設計

#### アーキテクチャ（クリーンアーキテクチャに影響を受けたレイヤー分離）

```
src/
├── domain/           # ドメインモデル（Effect Schema で定義）
├── repository/       # 外部データソースへのアクセス（操作単位にクラスとしてカプセル化）
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
- **API Routes 層**: クライアントサイドから叩かれるものだけを Hono の API として実装
  - RSC で使うデータ取得は API を経由せず `repository/query` を直接呼び出す

<a id="工夫した点こだわりポイント-設計api-layer"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Effect TS とクリーンアーキテクチャを組み合わせ、依存の方向を内側に限定**
   - Effect Schema でバリデーションと型推論を一元化し、DTO で各レイヤーの責務を明示
   - Command パターン（AWS SDK v3 に着想）で Repository を操作単位にカプセル化し、インターフェース肥大化を回避
   - エラーを `rateLimit` / `validation` / `serviceUnavailable` / `unknown` に reason マッピングし、上位層でのハンドリングを容易化
3. **hono-trpc で型安全な API 呼び出し**
   - クライアントからの API 呼び出しにも型が効く
4. **Swagger UI で API を直接検証**
   - フロントエンド経由での検証は非効率と判断（開発環境のみ）

</details>

#### レイヤーベース DI

```
SearchReposQuery       .main ← GitHub API      / .test ← モックデータ
GetRepoByFullNameQuery .main ← GitHub API      / .test ← モックデータ
DB                     .main ← Vercel Postgres / .test ← PGlite
RateLimitConfigTag     .main ← 本番設定        / .test ← テスト設定
```

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Effect の Layer を活用して、環境変数で依存を一括切り替え**
   - テスト時は GitHub API・外部 DB に依存せず動作（シード固定モック + PGlite）
   - 開発初期はモックで開発し、GitHub API の rate limit を消費しない安全なフロー
   - モックデータは E2E テストにもそのまま流用

</details>

#### マイグレーション

- Kysely の [Migrator](https://kysely.dev/docs/migrations) でファイルベースのスキーマ管理
  - `up()` / `down()` 関数でロールバック可能
  - 実行済みマイグレーションは `kysely_migration` テーブルで管理し、未実行分のみ適用

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **SQL を `.ts` ファイル内に `sql` タグで記述**
   - Vercel serverless 環境で `fs` が使えない可能性があるため、静的 import で解決（要検証）

</details>

#### Rate Limit

| | proxy（JWS cookie チャレンジ） | Hono ミドルウェア（Token Bucket） |
|---|---|---|
| **目的** | client_id 発行・非ブラウザクライアントの遮断 | GitHub API rate limit 保護 |
| **方式** | JWS 署名 cookie 発行・検証 + `x-client-id` 付与 | Token bucket（per-user + global） |
| **実行環境** | Next.js 16 `proxy.ts`（API ルートのみ） | Node.js Runtime |
| **ストレージ** | なし（ステートレス） | Vercel Postgres |

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **JWS 署名 cookie で per-client rate limit のバイパスを防止**
   - proxy が `client_id` cookie を JWS（HS256）で署名して発行
   - cookie なし（curl 等）は 425 で弾く。cookie を自動送信しないクライアントはここで遮断
     - `curl -c/-b` で突破できるが、同一 UUID を使い回すため per-client rate limit が機能する
   - 署名検証に失敗（偽造）は 500。毎回異なる UUID でのバイパスには署名鍵の漏洩が必要
   - cookie 管理は proxy に集約し、`x-client-id` ヘッダーで Hono に渡す。Hono は cookie を知らない設計
2. **per-user + global の2層 Token Bucket**
   - ユーザーごとの公平性（per-user）と GitHub API quota の保護（global）を分離
   - per-user: `x-client-id` ヘッダー単位で1ユーザーの独占を防止
   - global: `client_id = "global"` の共有行でサーバー全体のリクエスト数を制限し、GitHub API の rate limit（認証あり: 30req/min）に対して安全マージンを持たせて 20req/min に設定
   - 想定ケース:
     - 1人が連打 → per-user で制限（global は余裕あり）
     - 3人が同時に 10req/min ずつ → global で合計 20req/min に制限
     - 多数のユーザーが同時利用 → global が先に枯渇し、全ユーザーに 429。1人が使い切ると他ユーザーも影響を受けるが、per-user があるため1人の独占は防止される
3. **Race Condition 対策**: Token bucket は `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` で1つの SQL 文に集約
   - トークンの読み取り・計算・書き込みを原子的に実行し、同時リクエストによる race condition を防止

</details>

---

## テスト

| 層 | ツール | 対象 |
|---|--------|------|
| 統合 | Vitest | API Routes のリクエスト/レスポンス検証（レイヤーを差し替えて Hono アプリ全体をテスト） |
| プロパティベース | FastCheck | スキーマの変換は性質として記述しやすいため採用。Star 数の表示（1000 → 1.0k、1M+）等の境界値検証、ページネーションの表示パターン検証にも活用 |
| E2E | Playwright | 最低動作要件を仕様として fix し、ユーザーフローで検証。UI は未 fix のためテスト対象外（メンテコスト考慮） |
| コンポーネント | Storybook | UI コンポーネントの手動検証（カタログで状態パターンを確認） |
| 手動 | — | 自動化が難しい・仕様として未 fix の項目（下記参照） |

- CI（GitHub Actions）で check（lint + 型チェック + ユニットテスト）と E2E を並列実行
  - PR・main ブランチの両方で CI を回し、本番でエラーが起きにくい状態を維持
  - E2E はモックデータで動作するため、GitHub API の rate limit やネットワーク状態に依存しない

### 手動テスト項目

- [ ] ページネーションでページ移動できる（前後・先頭・末尾）
- [ ] キーワードを変更するとページが1にリセットされる
- [ ] 詳細ページから「Back to search」で戻ると、直前に見ていたリポジトリにスクロール復元される
- [ ] ヘッダーのロゴを押すとトップページ（`/`）に戻れる
- [ ] 存在しないリポジトリ URL にアクセスすると not-found ページが表示される
- [ ] Rate limit 連打で 429 エラーメッセージが表示される
- [ ] `curl <host>/api/search?q=react`（cookie なし）→ 425 が返る（client_id cookie チャレンジ）
- [ ] `curl <host>/api/search?q=react`（偽造 cookie）→ 500 が返る（JWS 署名検証失敗）

<a id="工夫した点こだわりポイント-テスト"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **プロパティベーステスト**: スキーマ変換は性質として記述しやすく、Star 数表示（1000 → 1.0k）等の境界値検証やページネーションの5パターン表示検証にも活用
2. **カタログ先行開発**: Storybook でデザインと動きを検証してからページに組み込むプロセスにより、手戻りを削減
3. **モックデータのレイヤー流用**: レイヤー切り替えで E2E テストにもそのまま流用できる設計
4. **Play function** によるインタラクションテスト含む（Storybook）
5. **末端部分のレビュー軽量化**: コアでなく容易に差し替え可能な部分（CSS・汎用 UI 等）にはレビューコストをかけすぎない判断

</details>

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
  - コアでなく容易に差し替え可能な末端部分（CSS・汎用 UI 等）はレビューを軽めにした
  - 全体を通して設計とレビューに最も時間を割いた
- **提案の取捨選択**: AI のレビュー提案のうち、読みやすさやプロジェクト規模に合わないものを却下
