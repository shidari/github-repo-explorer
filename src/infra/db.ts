import { PGlite } from "@electric-sql/pglite";
import { createKysely } from "@vercel/postgres-kysely";
import { Context, Effect, Layer } from "effect";
import {
  CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type Driver,
  Kysely,
  type Migration,
  type MigrationProvider,
  Migrator,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryCompiler,
} from "kysely";
import type { DB as Database } from "./__generated__/db.d";
import * as m001 from "./migrations/001_create_token_buckets";

export type { Database };

// ── PGlite Dialect（テスト用最小実装）──

class PGliteDriver implements Driver {
  constructor(private pglite: PGlite) {}
  async init(): Promise<void> {}
  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {
    await this.pglite.close();
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    return new PGliteConnection(this.pglite);
  }

  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("BEGIN"));
  }

  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("COMMIT"));
  }

  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("ROLLBACK"));
  }
}

class PGliteConnection implements DatabaseConnection {
  constructor(private pglite: PGlite) {}

  async executeQuery<R>(compiledQuery: CompiledQuery) {
    const result = await this.pglite.query<R>(compiledQuery.sql, [
      ...compiledQuery.parameters,
    ]);
    return {
      rows: result.rows,
      numAffectedRows: BigInt(result.affectedRows ?? 0),
    };
  }

  streamQuery(): AsyncIterableIterator<never> {
    throw new Error("PGlite does not support streaming");
  }
}

class PGliteDialect implements Dialect {
  constructor(private pglite: PGlite) {}
  createDriver(): Driver {
    return new PGliteDriver(this.pglite);
  }
  createQueryCompiler(): QueryCompiler {
    return new PostgresQueryCompiler();
  }
  createAdapter() {
    return new PostgresAdapter();
  }
  createIntrospector(db: Kysely<Database>): DatabaseIntrospector {
    return new PostgresIntrospector(db);
  }
}

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
    Effect.promise(async () => {
      const db = createKysely<Database>();
      await migrate(db);
      return { db };
    }),
  );

  static readonly test = Layer.effect(
    DB,
    Effect.promise(async () => {
      const pglite = new PGlite();
      const db = new Kysely<Database>({
        dialect: new PGliteDialect(pglite),
      });
      await migrate(db);
      return { db };
    }),
  );
}
