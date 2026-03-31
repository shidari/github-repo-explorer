import { createKysely } from "@vercel/postgres-kysely";
import { Config, Context, Effect, Layer } from "effect";
import {
  type Kysely,
  type Migration,
  type MigrationProvider,
  Migrator,
} from "kysely";
import type { DB as Database } from "./__generated__/db.d";
import * as m001 from "./migrations/001_create_token_buckets";

export type { Database };

// ── DB Layer ──
// NOTE: DB 接続の lifecycle（destroy）は管理していない。
// Layer.effect は Effect の Layer メモ化により1回だけ評価されるため、
// コネクションプールは起動時に1つ作られ、全リクエストで使い回される。
// Vercel (serverless) ではプロセスが短命だと判断し、destroy はプロセス終了時の
// OS によるソケット回収に任せている。

const migrationProvider: MigrationProvider = {
  async getMigrations(): Promise<Record<string, Migration>> {
    return {
      "001_create_token_buckets": m001,
    };
  },
};

async function migrate(db: Kysely<Database>) {
  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}

export class DB extends Context.Tag("DB")<
  DB,
  { readonly db: Kysely<Database> }
>() {
  static readonly main = Layer.effect(
    DB,
    Effect.gen(function* () {
      const connectionString = yield* Config.string("POSTGRES_URL");
      const db = createKysely<Database>({ connectionString });
      yield* Effect.promise(() => migrate(db));
      return { db };
    }),
  );

  static readonly ci = Layer.effect(
    DB,
    Effect.gen(function* () {
      const connectionString = yield* Config.string("CI_POSTGRES_URL");
      const db = createKysely<Database>({ connectionString });
      yield* Effect.promise(() => migrate(db));
      return { db };
    }),
  );
}
