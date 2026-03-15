import Link from "next/link";
import styles from "./_header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        GitHub Explorer
      </Link>
    </header>
  );
}
