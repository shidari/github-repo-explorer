"use client";

import { useSetAtom } from "jotai";
import Link from "next/link";
import styles from "./_header.module.css";
import { searchQueryAtom } from "./atoms";

export function Header() {
  const setQuery = useSetAtom(searchQueryAtom);
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo} onClick={() => setQuery("")}>
        GitHub Explorer
      </Link>
    </header>
  );
}
