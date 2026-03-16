"use client";

let state = {
  currentKey: "",
  promise: null as Promise<void> | null,
  resolved: false,
};
let timerId: ReturnType<typeof setTimeout> | null = null;

/**
 * レンダーフェイズで Suspense と統合できる debounce。
 * key が変わると Promise を throw し、Suspense に suspend させる。
 * 解決済みなら何もしない。
 */
function suspendForDebounce(key: string, ms: number): void {
  // 同じ key で解決済み → 何もしない
  if (key === state.currentKey && state.resolved) {
    return;
  }
  // 同じ key でまだ pending → 同じ promise を throw
  if (key === state.currentKey && state.promise) {
    throw state.promise;
  }
  // 新しい key → タイマーリセット
  if (timerId) clearTimeout(timerId);
  state = { currentKey: key, promise: null, resolved: false };
  const promise = new Promise<void>((resolve) => {
    timerId = setTimeout(() => {
      state.resolved = true;
      resolve();
    }, ms);
  });
  state.promise = promise;
  throw promise;
}

export function Debounce({
  debounceKey,
  ms,
  children,
}: {
  debounceKey: string;
  ms: number;
  children: React.ReactNode;
}) {
  // use() はクライアントコンポーネントで手動生成の Promise を未サポートのため
  // TanStack Query の useSuspenseQuery 等を参考に Promise を throw して
  // Suspense に suspend させている。use() が対応したら置き換える。
  suspendForDebounce(debounceKey, ms);
  return children;
}
