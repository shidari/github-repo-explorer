import { Effect } from "effect";
import Link from "next/link";
import { RepoDetail } from "@/components/features/detail/RepoDetail";
import { GetRepoByFullNameQuery } from "@/repository/query";
import styles from "./page.module.css";

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const query = yield* GetRepoByFullNameQuery;
      return yield* query.runAction({ owner, repo });
    }).pipe(
      Effect.provide(GetRepoByFullNameQuery.test),
      Effect.match({
        onSuccess: (data) => ({ ok: true as const, data }),
        onFailure: (err) => ({ ok: false as const, error: err }),
      }),
    ),
  );

  if (!result.ok) {
    return (
      <main className={styles.container}>
        <p className={styles.notFound}>
          {owner}/{repo} not found
        </p>
        <Link href="/search" className={styles.backLink}>
          Back to search
        </Link>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className={styles.container}>
      <Link href="/search" className={styles.backLink}>
        &larr; Back to search
      </Link>

      <RepoDetail repo={data} />
    </main>
  );
}
