import { PGlite } from "@electric-sql/pglite";
import { Context, Effect, Layer } from "effect";
import {
  CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type Driver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type QueryCompiler,
} from "kysely";
import type { DB as Database } from "./__generated__/db.d";

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

export class DB extends Context.Tag("DB")<
  DB,
  { readonly db: Kysely<Database> }
>() {
  static readonly test = Layer.effect(
    DB,
    Effect.promise(async () => {
      const pglite = new PGlite();
      const db = new Kysely<Database>({ dialect: new PGliteDialect(pglite) });

      await db.schema
        .createTable("token_buckets")
        .ifNotExists()
        .addColumn("client_id", "text", (col) => col.primaryKey())
        .addColumn("tokens", "real", (col) => col.notNull())
        .addColumn("last_refill", "timestamptz", (col) =>
          col.notNull().defaultTo(db.fn("now")),
        )
        .execute();

      return { db };
    }),
  );
}
