#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTAINER_NAME="kysely-codegen-pg"
DB_URL="postgres://codegen:codegen@localhost:5555/codegen"

echo "Building and starting Postgres..."
docker build -t "$CONTAINER_NAME" "$SCRIPT_DIR"
docker run --rm -d --name "$CONTAINER_NAME" -p 5555:5432 "$CONTAINER_NAME"

echo "Waiting for Postgres to be ready..."
until docker exec "$CONTAINER_NAME" pg_isready -U codegen > /dev/null 2>&1; do
  sleep 0.5
done
# initdb scripts が完了するまで少し待つ
sleep 1

echo "Generating types..."
pnpm exec kysely-codegen --url "$DB_URL" --dialect postgres --out-file "$SCRIPT_DIR/../__generated__/db.d.ts"

echo "Stopping Postgres..."
docker stop "$CONTAINER_NAME"

echo "Done."
