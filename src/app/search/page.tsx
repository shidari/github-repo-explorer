"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { Fragment, Suspense, useEffect } from "react";
import {
  lastVisitedRepoAtom,
  searchPageAtom,
  searchQueryAtom,
} from "@/app/atoms";
import { Debounce } from "@/components/debounce";
import {
  useSWRSuspenseSearchFirstPageResult,
  useSWRSuspenseSearchPageResult,
} from "@/components/features/search/hooks";
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

const DEBOUNCE_MS = 300;

export default function SearchPage() {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const page = useAtomValue(searchPageAtom);
  return (
    <>
      <SearchInput defaultValue={query} onInputChange={setQuery} />

      {query ? (
        <Suspense fallback={<SearchSkeleton />}>
          <Debounce debounceKey={query} ms={DEBOUNCE_MS}>
            <SearchResult query={query} page={page} />
          </Debounce>
        </Suspense>
      ) : (
        <EmptyState />
      )}
    </>
  );
}

function SearchResult({ query, page }: { query: string; page: number }) {
  const setPage = useSetAtom(searchPageAtom);

  const { data: result } = useSWRSuspenseSearchFirstPageResult(query);

  if (!result.ok) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          {result.tag === "notFound"
            ? `No results for "${query}"`
            : "An error occurred. Please try again later."}
        </p>
      </div>
    );
  }

  const { total_count, total_pages } = result.data;

  return (
    <>
      <div className={styles.resultHeader}>
        <p className={styles.count}>{total_count.toLocaleString()} results</p>
        <Pagination
          currentPage={page}
          totalPages={total_pages}
          onPageChange={(p) => {
            setPage(p);
          }}
        />
      </div>

      <Suspense fallback={<RepositoryListSkeleton />}>
        <RepositoryList query={query} page={page} />
      </Suspense>

      <Pagination
        currentPage={page}
        totalPages={total_pages}
        onPageChange={(p) => {
          window.scrollTo(0, 0);
          setPage(p);
        }}
      />
    </>
  );
}

function RepositoryList({ query, page }: { query: string; page: number }) {
  const { data: result } = useSWRSuspenseSearchPageResult(query, page);
  const [lastVisited, setLastVisited] = useAtom(lastVisitedRepoAtom);

  // マウント時に最後に訪問したリポジトリにスクロール
  useEffect(() => {
    if (lastVisited) {
      const el = document.querySelector(`[data-repo="${lastVisited}"]`);
      el?.scrollIntoView({ block: "center" });
    }
  }, [lastVisited]);

  if (!result.ok) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          {result.tag === "notFound"
            ? "No results found"
            : "An error occurred. Please try again later."}
        </p>
      </div>
    );
  }

  return (
    <ItemGroup>
      {result.data.items.map((repo, i) => (
        <Fragment key={repo.full_name}>
          {i > 0 && <ItemSeparator />}
          <Link
            href={`/repos/${repo.full_name}`}
            className={styles.repoLink}
            data-repo={repo.full_name}
            onClick={() => setLastVisited(repo.full_name)}
          >
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
  );
}

function RepositoryListSkeleton() {
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

function SearchSkeleton() {
  return (
    <div style={{ marginTop: "1.5rem" }}>
      <Skeleton
        style={{ width: "6rem", height: "1rem", borderRadius: "0.25rem" }}
      />
      <Skeleton
        style={{
          height: "2.5rem",
          borderRadius: "0.5rem",
          marginTop: "0.75rem",
        }}
      />
      <RepositoryListSkeleton />
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
