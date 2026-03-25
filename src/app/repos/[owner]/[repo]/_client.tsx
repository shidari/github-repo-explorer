"use client";

import Link from "next/link";
import { RepoDetail } from "@/components/features/detail/RepoDetail";
import type { Repository } from "@/domain";
import { useRecordVisitedRepoEffect } from "./hooks";
import styles from "./page.module.css";

export function RepoDetailClientPage({ repo }: { repo: Repository }) {
  useRecordVisitedRepoEffect(repo.full_name);

  return (
    <main className={styles.container}>
      <Link href="/search" className={styles.backLink}>
        &larr; Back to search
      </Link>

      <RepoDetail repo={repo} />
    </main>
  );
}
