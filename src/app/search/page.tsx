"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { Fragment, Suspense } from "react";
import {
  lastVisitedRepoAtom,
  searchPageAtom,
  searchQueryAtom,
} from "@/app/atoms";
import { UnsafeSingletonDebounce } from "@/components/debounce";
import {
  useSWRSuspenseSearchFirstPageResult,
  useSWRSuspenseSearchPageResult,
} from "@/components/features/search/hooks";
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
import { useRestoreRepoScrollPositionEffect } from "./hooks";
import styles from "./page.module.css";

const DEBOUNCE_MS = 300;

export function formatCount(n: number): string {
  if (n >= 1_000_000) return "1M+";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function SearchPage() {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const page = useAtomValue(searchPageAtom);
  return (
    <>
      <SearchInput defaultValue={query} onInputChange={setQuery} />

      {query ? (
        <Suspense fallback={<SearchSkeleton />}>
          <UnsafeSingletonDebounce debounceKey={query} ms={DEBOUNCE_MS}>
            <SearchResult query={query} page={page} />
          </UnsafeSingletonDebounce>
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
            : result.tag === "rateLimit"
              ? "リクエスト回数の上限に達しました。しばらく時間をおいてお試しください。"
              : result.tag === "validation"
                ? "検索条件が不正です。キーワードを変更してお試しください。"
                : "エラーが発生しました。改善しない場合はブラウザの cookie を削除してお試しください。"}
        </p>
      </div>
    );
  }

  const { total_count, total_pages } = result.data;

  return (
    <>
      <div className={styles.resultHeader}>
        <p className={styles.count} aria-live="polite">
          {total_count.toLocaleString()} results
        </p>
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
  const lastVisited = useAtomValue(lastVisitedRepoAtom);

  useRestoreRepoScrollPositionEffect(lastVisited);

  if (!result.ok) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>
          {result.tag === "notFound"
            ? "検索結果が見つかりませんでした"
            : result.tag === "rateLimit"
              ? "リクエスト回数の上限に達しました。しばらく時間をおいてお試しください。"
              : result.tag === "validation"
                ? "検索条件が不正です。キーワードを変更してお試しください。"
                : "エラーが発生しました。改善しない場合はブラウザの cookie を削除してお試しください。"}
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
            prefetch={true}
            className={styles.repoLink}
            data-repo={repo.full_name}
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
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
      <Skeleton className={styles.repositoryListSkeletonItem} />
    </div>
  );
}

function PaginationSkeleton() {
  return <Skeleton className={styles.paginationSkeleton} />;
}

function ResultCountSkeleton() {
  return <Skeleton className={styles.resultCountSkeleton} />;
}

function SearchSkeleton() {
  return (
    <div className={styles.searchSkeleton}>
      <ResultCountSkeleton />
      <PaginationSkeleton />
      <RepositoryListSkeleton />
      <PaginationSkeleton />
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>GitHub リポジトリを検索</p>
      <p>キーワードを入力してリポジトリを検索できます。</p>
    </div>
  );
}
