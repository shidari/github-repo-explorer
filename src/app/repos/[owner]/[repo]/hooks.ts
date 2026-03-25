import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { lastVisitedRepoAtom, searchQueryAtom } from "@/app/atoms";

// 直アクセス時は query が空なのでスキップ
export function useRecordVisitedRepoEffect(fullName: string) {
  const query = useAtomValue(searchQueryAtom);
  const setLastVisited = useSetAtom(lastVisitedRepoAtom);

  useEffect(() => {
    if (query === "") return;
    setLastVisited(fullName);
  }, [query, fullName, setLastVisited]);
}
