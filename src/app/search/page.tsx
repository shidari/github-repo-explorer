"use client";

import Link from "next/link";
import { Fragment, Suspense, useEffect, useState } from "react";

import useSWR from "swr";
import { client } from "@/app/api/_client";
import { Debounce } from "@/components/debounce";
import { formatCount } from "@/components/features/search/RepoOverview";
import { SearchInput } from "@/components/features/search/SearchInput";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./page.module.css";

async function fetcher([, q, page]: [string, string, number]) {
  const res = await client.api.search.$get({
    query: { q, page: String(page) },
  });
  if (!res.ok) {
    const error = await res.json();
    return { ok: false as const, message: error.message };
  }
  const data = await res.json();
  return { ok: true as const, data };
}

const DEBOUNCE_MS = 300;

const STORAGE_KEY = "search-state";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [restored, setRestored] = useState(false);

  // チラつかないためにレンダリングフェイズ（useState の初期値）で sessionStorage を読みたいが、
  // hydration エラーが出ていた可能性があり、useEffect に移したところ解消した。
  // これが原因かは確証がない。
  // 副作用として空→復元の 2 回レンダーによるチラつきがある。
  // TODO: 原因の特定とチラつきの解消
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.query) setQuery(saved.query);
        if (saved.page) setPage(saved.page);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("sessionStorage の読み込みに失敗:", e);
      }
    }
    setRestored(true);
  }, []);

  return (
    <>
      <SearchInput
        key={restored ? "restored" : "initial"}
        defaultValue={query}
        onInputChange={setQuery}
      />

      {query ? (
        <Suspense fallback={<SearchSkeleton />}>
          <Debounce debounceKey={query} ms={DEBOUNCE_MS}>
            <SearchResult query={query} page={page} onPageChange={setPage} />
          </Debounce>
        </Suspense>
      ) : (
        <EmptyState />
      )}
    </>
  );
}

function SearchResult({
  query,
  page,
  onPageChange,
}: {
  query: string;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const { data: result } = useSWR(["search", query, page], fetcher, {
    suspense: true,
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ query, page }));
  }, [query, page]);

  if (!result.ok) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          {result?.message ?? "Search failed"}
        </p>
      </div>
    );
  }

  const { data } = result;

  return (
    <>
      <div className={styles.resultHeader}>
        <p className={styles.count}>
          {data.total_count.toLocaleString()} results
        </p>
      </div>

      <ItemGroup>
        {data.items.map((repo, i) => (
          <Fragment key={repo.full_name}>
            {i > 0 && <ItemSeparator />}
            <Link href={`/repos/${repo.full_name}`} className={styles.repoLink}>
              <Item>
                <ItemMedia>
                  <Avatar
                    src={repo.owner.avatar_url}
                    alt={repo.owner.username}
                    fallback={repo.owner.username.slice(0, 2).toUpperCase()}
                    size="sm"
                  />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{repo.full_name}</ItemTitle>
                  {repo.description && (
                    <ItemDescription>{repo.description}</ItemDescription>
                  )}
                  <ItemFooter>
                    {repo.language && <Badge>{repo.language}</Badge>}
                    <span className={styles.stat}>
                      &#9733; {formatCount(repo.stargazers_count)}
                    </span>
                  </ItemFooter>
                </ItemContent>
              </Item>
            </Link>
          </Fragment>
        ))}
      </ItemGroup>

      <Pagination
        currentPage={page}
        totalPages={data.total_pages}
        onPageChange={(p) => {
          window.scrollTo(0, 0);
          onPageChange(p);
        }}
      />
    </>
  );
}

function SearchSkeleton() {
  return (
    <div className={styles.results}>
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>Search GitHub Repositories</p>
      <p>Enter a search query to find repositories.</p>
    </div>
  );
}
