import Link from "next/link";
import styles from "./pagination.module.css";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  baseHref: string;
};

function pageNumbers(current: number, total: number): (number | "...")[] {
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
  baseHref,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(currentPage, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Link
        href={`${baseHref}&page=${currentPage - 1}`}
        className={`${styles.page} ${currentPage <= 1 ? styles.disabled : ""}`}
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
      >
        Prev
      </Link>
      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={i < pages.length / 2 ? "ellipsis-left" : "ellipsis-right"}
            className={styles.ellipsis}
          >
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={`${baseHref}&page=${p}`}
            className={`${styles.page} ${p === currentPage ? styles.active : ""}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={`${baseHref}&page=${currentPage + 1}`}
        className={`${styles.page} ${currentPage >= totalPages ? styles.disabled : ""}`}
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
      >
        Next
      </Link>
    </nav>
  );
}
