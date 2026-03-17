import { atom } from "jotai";

// 検索結果 → 詳細 → 戻るときの scroll 復元用。詳細ページで full_name がセットされる
export const lastVisitedRepoAtom = atom<string | undefined>(undefined);

const _searchPageAtom = atom(1);

// ページ変更時に lastVisited をクリアし、前回の scroll 復元を無効化する
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
