# GitHub Repo Explorer

GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション。

**デプロイ**: https://github-repo-explorer-eta.vercel.app

## 目次

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [機能](#機能)
  - [フロントエンド](#フロントエンド)
    - 工夫した点・こだわりポイント
  - [API Layer](#api-layer)
    - 工夫した点・こだわりポイント
- [設計](#設計)
  - [フロントエンド設計](#フロントエンド設計)
    - 工夫した点・こだわりポイント
  - [API Layer 設計](#api-layer-設計)
    - 工夫した点・こだわりポイント
- [テスト](#テスト)
  - 工夫した点・こだわりポイント
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

- キーワードによるリポジトリ検索（debounce 付き自動検索）
- ページネーション
  - GitHub Search API の1000件制限に対応し、最大50ページにキャップ
  - 無限スクロールは GitHub REST API の仕様上複雑さが増すため不採用
- 詳細ページから検索結果に戻ったとき、前回見ていたリポジトリにスクロール復元

##### 工夫した点・こだわりポイント

1. **Suspense を活用した debounce で UX を維持しながら API リクエスト回数を抑制**（`UnsafeSingletonDebounce`）
   - Promise を throw して Suspense に suspend させることで、debounce 中は fallback を表示
     - `useDeferredValue` は UX の最適化はできるが API リクエスト抑制には使えないと判断し、固定 300ms の debounce を採用
     - デメリット: シングルトンで状態管理しており複数インスタンスの同時使用は不可（`clearTimeout` が競合）
       - 複数コンポーネント対応（Map による管理等）も検討したが、現状1箇所のみのため制約を命名で明示して対処
2. **ページネーションを前後1ページ + 先頭・末尾 + 省略記号のスマート表示にし、大量ページでも迷わない UI を実現**
3. **検索結果とページネーションの Suspense 境界を分離し、不要な fallback（ページ移動時に両者が suspend する）をなくして UX を改善**
4. SWR の preload による隣接ページの先読みを試みたが、Suspense との噛み合いが悪く断念
5. ページネーション連打で rate limit に引っかかる問題あり。現状は UI 上のエラーメッセージ表示で対応（リクエスト中の disabled 化は要調査）
6. **Jotai atom + `data-repo` 属性 + `scrollIntoView` でスクロール復元を自前実装**
   - Next.js 組み込みの scroll restoration が効かなかったため

#### 詳細表示

- リポジトリの詳細情報を表示

##### 工夫した点・こだわりポイント

1. **RSC で直接データ取得 + `Link prefetch={true}` + RSC キャッシュ（10分）で詳細ページへの遷移を高速化**
   - `page.tsx`（Server Component）でリポジトリクエリを直接実行。RSC にすることで prefetch が効き、不要な JS をクライアントに送らない
   - リポジトリ情報が10分未満で更新されることは稀と判断し `revalidate = 600`
   - RSC による詳細取得は Rate Limit の対象外（GitHub API 直接）のため、キャッシュで呼び出しを抑制
   - RSC キャッシュがサーバー上で共有されるため、prefetch によるリクエスト増加は GitHub API への負荷に直結しないと判断

#### フロントエンド共通

##### 工夫した点・こだわりポイント

1. **OGP 対応のため動的メタデータ（`generateMetadata`）を生成**
2. **エラー・Not Found 時に専用ページを表示し、ユーザーが行き止まりにならないよう配慮**（`error.tsx`, `global-error.tsx`, `not-found.tsx`）

### API Layer

- GitHub Search API をラップしたリポジトリ検索エンドポイントを API Routes で作成
- RSC で `repository/query` を直接呼び出す詳細取得（API Routes を経由しない）
- API Routes の OpenAPI スキーマの自動生成と Swagger UI（開発環境のみ）
- 2段構えの Rate Limit（proxy + Hono ミドルウェア）

#### 工夫した点・こだわりポイント

1. **依存の切り替え・型付きエラーハンドリングのために Effect TS を採用**
   - 結果・エラー・依存を型で表現し、エラーをパターンマッチできるためハンドリングの漏れを防止
2. **クライアントから叩かれるものだけを Hono の API として実装し、RSC は `repository/query` を直接呼び出すことで不要なネットワークラウンドトリップを排除**
3. **API の検証をフロントエンド経由で行うのは非効率と判断し、Swagger UI で手動検証**
4. **外部サービスを使用する Web アプリの負荷対策として、2段構えの Rate Limit を実装**

  GitHub Search API 自体に rate limit がある（認証なし: 10req/min、認証あり: 30req/min）。負荷対策は可能な限り厳密にやるべきと判断。

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
      P->>P: グローバル rate limit チェック (Upstash Redis)
      P->>P: IP rate limit チェック (インメモリ)
      P->>P: JWS 署名検証 → UUID 取り出し
      P->>H: GET /api/search (x-client-id: <uuid>)
      H->>H: Token bucket チェック (Postgres)
      H->>G: GitHub Search API
      G-->>H: 結果
      H-->>C: 200 JSON
  ```

  - 通常利用では debounce + SWR キャッシュにより 10req/min 程度に収まると想定。短時間に大量のリクエストが集中した場合は1段目の proxy で遮断

---

## 設計

### フロントエンド設計

#### 状態管理

| | クライアントステート | サーバーステート |
|---|---|---|
| **ライブラリ** | Jotai | SWR |
| **役割** | 検索クエリ・ページ番号・スクロール復元 | API レスポンスのキャッシュ・再取得 |
| **任せたいこと** | ページ単位のインメモリなグローバル状態管理 | Suspense 対応のキャッシュ・再取得管理 |

##### 工夫した点・こだわりポイント

1. **Jotai でセッション情報に近いものを管理し、複雑さを軽減**
   - セッション情報に近い情報の管理として採用
   - 当初は session storage を検討したが、hydration の問題が発生したためインメモリ state に切り替え（要検証）
   - URL state（searchParams / useSearchParams）は不採用
     - `searchParams` は Page の再レンダリングを引き起こす可能性があり、自動検索 UI とは相性が悪いと判断（要検証）
     - `useSearchParams` なら再レンダリング問題は回避できそうだが、検索状態を URL で管理する必然性が薄い（検索画面を共有するユースケースも一般的でない）
     - Jotai の atom で依存関係を宣言的に記述する方が見通しが良いと判断
   - atom の writer/reader で状態間の依存関係を宣言的に記述
     - `searchQueryAtom`: クエリ変更時にページを1にリセット + scroll 復元状態をクリア
     - `searchPageAtom`: ページ変更時に scroll 復元状態をクリア
     - `lastVisitedRepoAtom`: 詳細ページで full_name をセット。検索結果に戻ったときの scroll 復元に使用
2. **SWR で Suspense 対応のキャッシュ・再取得管理を委譲**
   - Suspense が使える点と、クライアント側の server state キャッシュ管理を任せられる点から採用
     - Next.js と同じ Vercel 製でエコシステムを統一
     - 今回の要件に絞るため `revalidateOnFocus` / `revalidateOnReconnect` は無効化（仕様の簡略化）
   - Suspense はレンダリングのサスペンドにより不要なレンダリングやレンダリング結果の不整合をなくし、表示を最適化するために使用

#### コンポーネント設計

- 汎用 UI（`components/ui/`）と機能固有コンポーネント（`components/features/`）を分離
  - shadcn/ui のデザインとコンポーネント設計をベースに、必要なコンポーネントを追加
    - 今回の要件は CSS Modules で対応できると判断し、Radix UI や Tailwind CSS は不必要な依存として追加しない戦略
    - `next/image` による Image Optimization は `components/ui/` が Next.js に依存する形になるため見送り
  - ドメインが絡むコンポーネントは `components/features/` 内で作成
##### 工夫した点・こだわりポイント

1. **shadcn/ui ベースだが Radix UI / Tailwind CSS を外し CSS Modules で直接実装**
   - 今回の要件では不要な依存と判断
2. **Storybook でコンポーネントの検証だけを行えるようにした**
   - page.tsx での確認だと他の要因が絡んでくるため、コンポーネント単体で検証できる環境が必要と判断
   - カタログを先に作り、デザインと動きを検証してからページに組み込むプロセスで開発できた

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

### API Layer 設計

#### アーキテクチャ（DDD + Layered Architecture）

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

##### 工夫した点・こだわりポイント

1. **Command パターンによる Repository カプセル化**
   - AWS SDK v3 に着想し、操作単位にクラス化。Repository パターンのインターフェース肥大化を回避
3. **エラーの reason マッピング**: HTTP ステータスを `rateLimit` / `validation` / `serviceUnavailable` / `unknown` にマッピングし、上位層でのハンドリングを容易化
4. **hono-trpc でクライアントからの API 呼び出しも型安全に**
5. **OpenAPI スキーマの自動生成と Swagger UI を提供（開発環境のみ）**
   - API の検証をフロントエンド経由で行うのは非効率と判断し、Swagger UI で手動検証

#### レイヤーベース DI

```
SearchReposQuery       .main ← GitHub API      / .test ← モックデータ
GetRepoByFullNameQuery .main ← GitHub API      / .test ← モックデータ
DB                     .main ← Vercel Postgres / .test ← PGlite
RateLimitConfigTag     .main ← 本番設定        / .test ← テスト設定
GlobalRateLimiter      .main ← Upstash Redis   / .test ← インメモリ固定ウィンドウ
```

##### 工夫した点・こだわりポイント

1. **Effect の `Tag` + `Layer` でインターフェースを抽象化し、`NODE_ENV` だけで本番とテストの実装を一括切り替え可能にした**
   - テスト時は GitHub API・外部 DB に依存せず動作（シード固定のモックデータ + インメモリ DB（PGlite）、Rate limit 閾値もテスト用に差し替え）
   - インターフェースを事前定義し、開発初期は部分的にモックを使いながら開発。GitHub API を極力叩かず rate limit を消費しない安全な開発フロー
   - モックデータはそのまま E2E テストにも流用

#### マイグレーション

- Kysely の [Migrator](https://kysely.dev/docs/migrations) でファイルベースのスキーマ管理
  - `up()` / `down()` 関数でロールバック可能
  - 実行済みマイグレーションは `kysely_migration` テーブルで管理し、未実行分のみ適用

##### 工夫した点・こだわりポイント

1. **`.ts` ファイル内に `sql` タグで SQL を記述**
   - Vercel serverless 環境で `fs` が使えない可能性があるため、静的 import で解決（要検証）

#### Rate Limit

| | 1段目: proxy | 2段目: Hono ミドルウェア |
|---|---|---|
| **目的** | バーストリクエストの遮断・client_id 発行 | GitHub API rate limit 保護 |
| **方式** | IP ベース（20req/min）+ JWS 署名 cookie 発行・検証 + `x-client-id` 付与 | Token bucket |
| **実行環境** | Next.js 16 `proxy.ts`（API ルートのみ） | Node.js Runtime |
| **ストレージ** | グローバル: Upstash Redis / IP: インメモリ | Vercel Postgres |
| **ストレージ選定理由** | グローバルは分散ノード間共有のため Redis。IP は手軽さ優先でインメモリ | 無料で Vercel コンソールから管理可能 |

##### 工夫した点・こだわりポイント

1. **ベストエフォートで厳密さ・堅牢さを保証するために多段階の複数の rate limiter を統合**
  - **1段目: proxy**
    - **グローバル rate limit（Upstash Redis）**: IP 偽装による per-IP 制限バイパスを防ぐための絶対的な上限（100req/min）。Vercel KV（Upstash Redis）を使うことでノード間共有を実現。`KV_REST_API_URL` / `KV_REST_API_TOKEN` 環境変数で接続
    - **IP rate limit（インメモリ）**: IP アドレス単位で 20req/min
      - API Routes ではサーバーの立ち上げコードを触れず、DB コネクションのライフサイクル管理ができないため、インメモリを選択
    - **client_id cookie（JWS 署名）による per-client rate limit バイパス対策**
      - proxy が `client_id` cookie を JWS（HS256）で署名して発行。`CLIENT_ID_SIGNING_SECRET` 環境変数が署名鍵
      - cookie がないリクエスト（curl 等）は 425 を返し、cookie を発行。cookie を自動送信しないクライアントはここで弾かれる
        - `curl -c/-b` で cookie を保存・送信すれば突破できるが、その場合は同一 UUID を使い回すことになるため per-client rate limit が正しく機能する
      - cookie の署名検証に失敗（偽造）した場合は 500 を返す。毎回異なる UUID でバイパスするには `CLIENT_ID_SIGNING_SECRET` の漏洩が必要
      - `client_id` の管理は proxy 側に集約し、`x-client-id` ヘッダーとして Hono に渡す。Hono は cookie を一切知らない設計
  - **2段目: Hono ミドルウェア**
    - **per-user + global の2層 Token Bucket**: ユーザーごとの公平性（per-user）と GitHub API quota の保護（global）を分離
      - per-user: `x-client-id` ヘッダー単位で1ユーザーの独占を防止
      - global: `client_id = "global"` の共有行でサーバー全体のリクエスト数を制限し、GitHub API の rate limit（認証あり: 30req/min）に対して安全マージンを持たせて 20req/min に設定
      - 想定ケース:
        - 1人が連打 → per-user で制限（global は余裕あり）
        - 3人が同時に 10req/min ずつ → global で合計 20req/min に制限
        - 多数のユーザーが同時利用 → global が先に枯渇し、全ユーザーに 429。1人が使い切ると他ユーザーも影響を受けるが、per-user があるため1人の独占は防止される
    - **Race Condition 対策**: Token bucket は `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` で1つの SQL 文に集約
      - トークンの読み取り・計算・書き込みを原子的に実行し、同時リクエストによる race condition を防止

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

### 工夫した点・こだわりポイント

1. **プロパティベーステスト**: スキーマ変換は性質として記述しやすく、Star 数表示（1000 → 1.0k）等の境界値検証やページネーションの5パターン表示検証にも活用
2. **カタログ先行開発**: Storybook でデザインと動きを検証してからページに組み込むプロセスにより、手戻りを削減
3. **モックデータのレイヤー流用**: レイヤー切り替えで E2E テストにもそのまま流用できる設計
4. **Play function** によるインタラクションテスト含む（Storybook）
5. **末端部分のレビュー軽量化**: コアでなく容易に差し替え可能な部分（CSS・汎用 UI 等）にはレビューコストをかけすぎない判断

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
