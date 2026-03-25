"use client";

import Link from "next/link";
import styles from "./page.module.css";

export default function RepoDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.container}>
      <p className={styles.notFound}>エラーが発生しました</p>
      <p>{error.message}</p>
      <button type="button" onClick={reset}>
        再試行
      </button>
      <Link href="/search" className={styles.backLink}>
        検索に戻る
      </Link>
    </main>
  );
}
