# コーディング規約・運用ルール

## General Rules

- **プロジェクト外のファイル参照禁止**: 原則として、このリポジトリ外のファイルを参照・編集しないこと
- **ad-hoc スクリプト禁止**: コマンド出力の加工に `python3 -c`, `node -e` 等のワンライナーを使わないこと。`jq` 等の専用ツールを使う

## Coding Conventions

- **Formatting/Linting**: Biome を使用（staged ファイルのみ対象。プロジェクト全体への実行は禁止）
- **Commits**: Conventional Commits format
  - Message in Japanese
  - Include scope (e.g., `feat(search): リポジトリ検索機能を追加`)
  - Include body explaining the change
- **Package Manager**: pnpm
- **CLI実行**: `npx` ではなく `pnpm exec` を使うこと
- **GitHub CLI**: `gh` は直接実行せず `devbox run gh` で実行すること
- **PR body**: バッククォート等の特殊文字を含む場合は `--body-file` を使うこと（`--body` でのインライン指定は禁止）
- **修正作業の開始前**: コードの修正・追加を始める前に、まず `git pull --rebase` で最新の状態にすること
- **コミットフロー（MUST）**: ユーザーが「コミット」「コミットして」等を依頼した場合、直接 `git commit` を実行してはならない。必ず `.claude/commands/commit-and-pr.md` に定義されたフロー全体（Pre-commit チェック → コミット → ブランチ作成 & Push → PR 作成）を実行すること
- **コミット後の自動PR**: コミット完了後、以下を自動実行する
  1. main ブランチ上なら、コミット内容に基づいたブランチ名（例: `feat/xxx`, `refactor/xxx`）を自動作成し、コミットをそのブランチに移動する
  2. `git push -u origin <branch>` でリモートに push
  3. そのブランチの PR が未作成なら `gh pr create` で PR を作成する（既存なら push のみ）
