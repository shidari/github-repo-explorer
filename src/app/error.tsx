"use client";

import styles from "./error.module.css";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.container}>
      <h1>エラーが発生しました</h1>
      <p>予期しないエラーが発生しました。再試行してください。</p>
      <button type="button" className={styles.retryButton} onClick={reset}>
        再試行
      </button>
    </main>
  );
}
