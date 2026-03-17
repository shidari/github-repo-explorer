"use client";

import styles from "./pagination.module.css";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/**
 * ページネーションに表示するページ番号の配列を生成する。
 *
 * - 7ページ以下: 全ページを表示
 * - 8ページ以上: [1, ..., current-1, current, current+1, ..., last] の形式
 *
 * @example
 * pageNumbers(1, 5)   // [1, 2, 3, 4, 5]
 * pageNumbers(5, 50)  // [1, "...", 4, 5, 6, "...", 50]
 * pageNumbers(1, 50)  // [1, 2, 3, "...", 50]
 * pageNumbers(50, 50) // [1, "...", 49, 50]
 */
export function pageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(currentPage, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className={`${styles.page} ${currentPage <= 1 ? styles.disabled : ""}`}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={i < pages.length / 2 ? "ellipsis-left" : "ellipsis-right"}
            className={styles.ellipsis}
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.page} ${p === currentPage ? styles.active : ""}`}
            aria-current={p === currentPage ? "page" : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={`${styles.page} ${currentPage >= totalPages ? styles.disabled : ""}`}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
