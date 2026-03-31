# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。


## 目次

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [機能](#機能)
  - [フロントエンド](#フロントエンド)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-機能フロントエンド)
  - [バックエンド](#バックエンド)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-機能バックエンド)
- [設計](#設計)
  - [フロントエンド設計](#フロントエンド設計)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-設計フロントエンド)
  - [バックエンド 設計](#バックエンド-設計)
    - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-設計バックエンド)
- [テスト](#テスト)
  - [工夫した点・こだわりポイント](#工夫した点こだわりポイント-テスト)
- [AI 利用レポート](#ai-利用レポート)

## Tech Stack

| カテゴリ | 技術 |
|---------|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + React Compiler |
| Language | TypeScript 5 |
| バックエンド | Hono + hono-openapi |
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
  - 最大50ページにキャップ
    - GitHub Search API の1000件制限に対応
  - 無限スクロールは GitHub REST API の仕様上複雑さが増すため不採用
- スクロール復元
  - 詳細ページから検索結果に戻ったとき、前回見ていたリポジトリの位置に自動スクロール

<a id="工夫した点こだわりポイント-機能フロントエンド"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **遅延処理を Suspense（Promise を throw）で実現**
     - `useDeferredValue` は UX 最適化のみで API リクエスト抑制には使えないと判断し、固定 300ms を採用
     - デメリット: シングルトンのため複数インスタンスの同時使用は不可（`clearTimeout` が競合）
       - 複数コンポーネント対応（Map 管理等）も検討したが、現状1箇所のみのため制約を命名で明示して対処
2. **検索結果とページネーションの Suspense 境界を分離**
   - ページ移動時にページネーション UI が消えないよう改善
3. **スクロール復元の自前実装**
   - Jotai atom + `data-repo` 属性 + `scrollIntoView` で実装
     - Next.js 組み込みの scroll restoration が効かなかったため

</details>

**未解決の課題**

- SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念
- ページネーション連打で rate limit に引っかかる問題あり。現状は UI 上のエラーメッセージ表示で対応（リクエスト中の disabled 化は要調査）

#### 詳細表示

- 詳細情報の表示
  - リポジトリの README、スター数、言語などを表示

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **RSC + prefetch + キャッシュで遷移を高速化**
   - サーバー側でコンポーネントを生成し、クライアントへの JS 送信量を削減。TTFB・TTI を改善
   - `Link prefetch={true}` で RSC ペイロードを事前取得し、ナビゲーション時間を軽減
   - RSC キャッシュ（`revalidate = 600`）で表示速度の向上と不要な GitHub API 呼び出しの抑制を両立

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

### バックエンド

- proxy
  - JWS cookie チャレンジ
  - Challenge Rate Limit（Redis ロック + ランダム TTL による cookie 発行スロットリング）
- API Routes（Hono）
  - GitHub Search API をラップしたリポジトリ検索エンドポイント
  - Token Bucket Rate Limit
- RSC
  - `repository/query` を直接呼び出す詳細取得（API Routes を経由しない）

<a id="工夫した点こだわりポイント-機能バックエンド"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Effect TS の採用**
   - 結果・エラー・依存を型で表現し、エラーをパターンマッチできるためハンドリングの漏れを防止
2. **Swagger UI で API を直接検証**
   - ローカルでの開発の効率化
4. **JWS cookie チャレンジ + Token Bucket で負荷対策と公平性を確保**
   - Token Bucket で全体の負荷を抑えつつ、per-user 制限で1人が使い切って他ユーザーが使えなくなることを防止
     - GitHub Search API 自体に rate limit がある（認証なし: 10req/min、認証あり: 30req/min）

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
   - atom の writer/reader で状態間の依存関係を宣言的に記述
     - `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
     - `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
     - `lastVisitedRepoAtom`: 詳細ページで full_name をセット
     - URL state は不採用
       - `searchParams` は Page の再レンダリングを引き起こす可能性があり、自動検索 UI と相性が悪いと判断（要検証）
       - `useSearchParams` なら回避できそうだが、検索状態を URL で管理する必然性が薄い
     - 当初は session storage を検討したが、hydration の問題が発生したためインメモリに切り替え（要検証）
2. **SWR で Suspense 対応のキャッシュ管理を委譲**
   - TanStack Query も検討したが、Next.js と同じ Vercel 製で軽量な SWR を選択
   - `revalidateOnFocus` / `revalidateOnReconnect` は無効化（仕様の簡略化）

</details>

#### コンポーネント設計

- 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **shadcn/ui の依存をそのまま引き継がない**
   - shadcn/ui のデザインとコンポーネント設計をベースにしつつ、Radix UI + Tailwind CSS には依存せずコンポーネントは直書き、CSS は CSS Modules を採用
     - `next/image` による Image Optimization は `components/ui/` が Next.js に依存する形になるため見送り
2. **Storybook でコンポーネント単体検証**
   - コンポーネント単体で状態パターンを確認できる環境を確保
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

### バックエンド 設計

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

<a id="工夫した点こだわりポイント-設計バックエンド"></a>

<details open>
<summary><strong>工夫した点・こだわりポイント</strong></summary>

1. **Effect TS とクリーンアーキテクチャを組み合わせ、依存の方向を内側に限定**
   - Effect Schema でバリデーションと型推論を一元化し、DTO で各レイヤーの責務を明示
   - Effect の Layer によりレイヤー単位の DI が簡単に行え、テストしやすい構造を実現
   - 環境変数でレイヤーを一括切り替え（テスト時は GitHub API に依存せず動作）
   - 開発初期はモックで開発し、GitHub API の rate limit を消費しない安全なフロー
   - モックデータは E2E テストにもそのまま流用

   ```
   SearchReposQuery       .main ← GitHub API      / .test ← モックデータ
   GetRepoByFullNameQuery .main ← GitHub API      / .test ← モックデータ
   DB                     .main ← Vercel Postgres (Neon)
   RateLimitConfigTag     .main ← 本番設定        / .test ← テスト設定
   ChallengeRedisConfig   .main ← KV_REST_API_*   / .ci  ← CI_KV_REST_API_*
   ChallengeRateLimit     .main ← Upstash Redis
   ```

2. **Command パターン（AWS SDK v3 に着想）で Repository を操作単位にカプセル化**
   - 今回の規模ではインターフェース肥大化は起きないが、スケール時を意識した設計
3. **hono-trpc で型安全な API 呼び出し**
   - クライアントからの API 呼び出しにも型が効く
4. **Swagger UI で API を直接検証**
   - ローカルでの API 検証を効率化（開発環境のみ）
5. **マイグレーションの SQL を `.ts` ファイル内に `sql` タグで記述**
   - Vercel serverless 環境で `fs` が使えない可能性があるため、静的 import で解決（要検証）
6. **JWS 署名 cookie で per-client rate limit のバイパスを防止**
   - cookie なし（curl 等）は 425 で遮断。`curl -c/-b` で突破できるが、同一 UUID を使い回すため per-client rate limit が機能する

   | | proxy（JWS cookie チャレンジ） | proxy（Challenge Rate Limit） | Hono ミドルウェア（Token Bucket） |
   |---|---|---|---|
   | **目的** | client_id 発行・非ブラウザクライアントの遮断 | cookie 使い捨て攻撃の緩和 | GitHub API rate limit 保護 |
   | **方式** | JWS 署名 cookie 発行・検証 + `x-client-id` 付与 | Redis `SET NX PX` によるグローバルロック + ランダム TTL（3〜5秒） | Token bucket（per-user + global） |
   | **実行環境** | Next.js 16 `proxy.ts`（API ルートのみ） | Next.js 16 `proxy.ts`（API ルートのみ） | Node.js Runtime |
   | **ストレージ** | なし（ステートレス） | Upstash Redis | Vercel Postgres |

7. **Challenge Rate Limit で cookie 使い捨て攻撃を緩和**
   - cookie を破棄して再取得を繰り返す攻撃に対し、cookie 発行のスループットを制限
   - Redis の `SET NX PX` で同時に1件のみ cookie 発行を許可。TTL をランダム（3〜5秒）にし、攻撃者がロック解除タイミングを予測しにくくする
   - 既に cookie を持っている正規ユーザーには影響なし（challenge rate limit を通らない）
   - スループット: 平均 15 req/min（global の 20 req/min を超えない）
8. **per-user + global の2層 Token Bucket**
   - ユーザーごとの公平性（per-user）と GitHub API quota の保護（global）を分離
   - per-user: `x-client-id` ヘッダー単位で1ユーザーの独占を防止
   - global: `client_id = "global"` の共有行でサーバー全体のリクエスト数を制限し、GitHub API の rate limit（認証あり: 30req/min）に対して安全マージンを持たせて 20req/min に設定
   - 想定ケース:
     - 1人が連打 → per-user で制限（global は余裕あり）
     - 3人が同時に 10req/min ずつ → global で合計 20req/min に制限
     - 多数のユーザーが同時利用 → global が先に枯渇し、全ユーザーに 429。1人が使い切ると他ユーザーも影響を受けるが、per-user があるため1人の独占は防止される
   - **既知の限界**: HTTP レベルでは「ブラウザである証明」はハードウェア証明（WebAuthn 等）を除き不可能で、本格的な対策は Cloudflare 等の専門サービスが必要な領域
8. **Race Condition 対策**: Token bucket は `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` で1つの SQL 文に集約
   - トークンの読み取り・計算・書き込みを原子的に実行し、同時リクエストによる race condition を防止

</details>

---

## テスト

| 層 | ツール | 対象 |
|---|--------|------|
| 統合（CI） | Vitest (`test:ci`) | API Routes・proxy の統合テスト。本物の Upstash Redis + Vercel Postgres (Neon) に対して実行 |
| ローカル | Vitest (`test:local`) | プロパティベーステスト・スキーマ検証等。外部サービス不要 |
| E2E | Playwright | 最低動作要件を仕様として fix し、ユーザーフローで検証。UI は未 fix のためテスト対象外（メンテコスト考慮） |
| コンポーネント | Storybook | UI コンポーネントの手動検証（カタログで状態パターンを確認） |
| 手動 | — | 自動化が難しい・仕様として未 fix の項目（下記参照） |

- CI（GitHub Actions）で check（lint + 型チェック + ローカルテスト）、統合テスト、E2E を並列実行
  - PR・main ブランチの両方で CI を回し、本番でエラーが起きにくい状態を維持
  - E2E はモックデータで動作するため、GitHub API の rate limit やネットワーク状態に依存しない
  - 統合テスト（`test:ci`）は本物の Redis / Postgres に対して実行し、PGlite やインメモリモックとの乖離を排除
  - Upstash Redis は Free プラン（1インスタンス制限）のため、CI と本番で同一インスタンスを共有（キー名で分離）

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
- **コードレビュー**: コアな部分を重点的に確認し、余裕があれば細部も見る方針
  - コアでなく容易に差し替え可能な末端部分（CSS・汎用 UI 等）はレビューを軽めにした
  - 全体を通して設計とレビューに最も時間を割いた
- **提案の取捨選択**: AI のレビュー提案のうち、読みやすさやプロジェクト規模に合わないものを却下
