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
      <p className={styles.notFound}>Something went wrong</p>
      <p>{error.message}</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
      <Link href="/search" className={styles.backLink}>
        Back to search
      </Link>
    </main>
  );
}
