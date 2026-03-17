import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.container}>
      <h1>404 - ページが見つかりません</h1>
      <p>お探しのページは存在しません。</p>
      <Link href="/search">検索に戻る</Link>
    </main>
  );
}
