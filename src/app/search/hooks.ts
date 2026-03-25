import { useEffect } from "react";

export function useRestoreRepoScrollPositionEffect(lastVisited?: string) {
  useEffect(() => {
    if (!lastVisited) return;
    // HACK: 詳細ページの「Back to search」リンクと検索欄の位置が重なるため、
    // 戻った際に検索欄にフォーカスが移り scrollIntoView が無効化される。
    // 暫定的に blur で回避する。一瞬ちらつきが発生する副作用あり。
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    const el = document.querySelector(`[data-repo="${lastVisited}"]`);
    el?.scrollIntoView({ block: "center" });
  }, [lastVisited]);
}
