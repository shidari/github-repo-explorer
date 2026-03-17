"use client";

import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { useEffect } from "react";
import { lastVisitedRepoAtom, searchQueryAtom } from "@/app/atoms";
import { RepoDetail } from "@/components/features/detail/RepoDetail";
import type { Repository } from "@/domain";
import styles from "./page.module.css";

export function RepoDetailClientPage({ repo }: { repo: Repository }) {
  const query = useAtomValue(searchQueryAtom);
  const setLastVisited = useSetAtom(lastVisitedRepoAtom);

  // 検索結果から遷移した場合のみ、スクロール復元用に訪問リポジトリを記録する
  // 直アクセス時は query が空なのでスキップ
  useEffect(() => {
    if (query !== "") {
      setLastVisited(repo.full_name);
    }
  }, [query, repo.full_name, setLastVisited]);

  return (
    <main className={styles.container}>
      <Link href="/search" className={styles.backLink}>
        &larr; Back to search
      </Link>

      <RepoDetail repo={repo} />
    </main>
  );
}
