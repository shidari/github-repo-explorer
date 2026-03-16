"use client";

import Link from "next/link";
import { Fragment, Suspense, useDeferredValue, useState } from "react";
import useSWR from "swr";
import { client } from "@/app/api/_client";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  // TODO: network request の頻度制御のため debounce の導入を検討する
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(1);
  const isPending = query !== deferredQuery;

  return (
    <>
      <SearchInput defaultValue="" onInputChange={setQuery} />

      {(() => {
        if (!query && !deferredQuery) return <EmptyState />;
        if (isPending) return <SearchSkeleton />;
        return (
          <Suspense fallback={<SearchSkeleton />}>
            <SearchResult
              query={deferredQuery}
              page={page}
              onPageChange={setPage}
            />
          </Suspense>
        );
      })()}
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
        onPageChange={onPageChange}
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
