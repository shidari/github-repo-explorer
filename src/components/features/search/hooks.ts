import useSWR from "swr";
import { client } from "@/app/api/_client";

async function fetcher([, q, page]: [string, string, number]) {
  let res = await client.api.search.$get({
    query: { q, page: String(page) },
  });

  // 初回訪問時は cookie 未発行のため 425 が返る。cookie が自動セットされるのでそのままリトライ
  const status: number = res.status;
  if (status === 425) {
    res = await client.api.search.$get({ query: { q, page: String(page) } });
  }

  if (!res.ok) {
    const error = await res.json();
    const tag = (() => {
      switch (res.status) {
        case 404:
          return "notFound" as const;
        case 400:
          return "validation" as const;
        case 429:
          return "rateLimit" as const;
        default:
          return "unknown" as const;
      }
    })();
    return { ok: false as const, tag, message: error.message };
  }
  const data = await res.json();
  return { ok: true as const, data };
}

// page=1 固定で total_pages・total_count を取得（Pagination 用）
export function useSWRSuspenseSearchFirstPageResult(query: string) {
  return useSWRSuspenseSearchPageResult(query, 1);
}

// 指定ページの検索結果を取得
export function useSWRSuspenseSearchPageResult(query: string, page: number) {
  return useSWR(["search", query, page], fetcher, {
    suspense: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
