import { atom } from "jotai";

export const lastVisitedRepoAtom = atom<string | undefined>(undefined);

const _searchPageAtom = atom(1);

export const searchPageAtom = atom(
  (get) => get(_searchPageAtom),
  (_, set, value: number) => {
    set(_searchPageAtom, value);
    set(lastVisitedRepoAtom, undefined);
  },
);

const _searchQueryAtom = atom("");

// クエリ変更時に page リセット + lastVisited クリア
export const searchQueryAtom = atom(
  (get) => get(_searchQueryAtom),
  (_, set, value: string) => {
    set(_searchQueryAtom, value);
    set(_searchPageAtom, 1);
    set(lastVisitedRepoAtom, undefined);
  },
);
