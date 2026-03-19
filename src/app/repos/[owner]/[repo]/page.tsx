import { Effect } from "effect";
import type { Metadata } from "next";
import Link from "next/link";
import { GetRepoByFullNameQuery } from "@/repository/query";
import { RepoDetailClientPage } from "./_client";
import styles from "./page.module.css";

export const revalidate = 600;

type Props = { params: Promise<{ owner: string; repo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo } = await params;
  return { title: `${owner}/${repo}` };
}

export default async function RepoDetailPage({ params }: Props) {
  const { owner, repo } = await params;

  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const query = yield* GetRepoByFullNameQuery;
      return yield* query.runAction({ owner, repo });
    }).pipe(
      Effect.provide(
        process.env.NODE_ENV === "production"
          ? GetRepoByFullNameQuery.main
          : GetRepoByFullNameQuery.test,
      ),
      Effect.match({
        onSuccess: (data) => ({ ok: true as const, data }),
        onFailure: (err) => {
          console.error("[RepoDetailPage] failed to fetch repo:", {
            owner,
            repo,
            error: err,
          });
          return { ok: false as const, error: err };
        },
      }),
    ),
  );

  if (!result.ok) {
    const message =
      result.error._tag === "RepoNotFoundError"
        ? `${owner}/${repo} が見つかりませんでした`
        : "エラーが発生しました。しばらく時間をおいてから再度お試しください。";
    return (
      <main className={styles.container}>
        <p className={styles.notFound}>{message}</p>
        <Link href="/search" className={styles.backLink}>
          検索に戻る
        </Link>
      </main>
    );
  }

  return <RepoDetailClientPage repo={result.data} />;
}
