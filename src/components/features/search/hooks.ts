import useSWR from "swr";
import { client } from "@/app/api/_client";

async function fetcher([, q, page]: [string, string, number]) {
  const res = await client.api.search.$get({
    query: { q, page: String(page) },
  });
  if (!res.ok) {
    const error = await res.json();
    // ミドルウェアが返す 429 の型を推論する方法が不明なため、手動でユニオンに追加
    const unsafeStatus: typeof res.status | 429 = res.status;
    const tag =
      unsafeStatus === 404
        ? ("notFound" as const)
        : unsafeStatus === 400
          ? ("validation" as const)
          : unsafeStatus === 429
            ? ("rateLimit" as const)
            : ("unknown" as const);
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
