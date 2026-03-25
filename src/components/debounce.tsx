"use client";

let state = {
  currentKey: "",
  promise: null as Promise<void> | null,
  resolved: false,
};
let timerId: ReturnType<typeof setTimeout> | null = null;

/**
 * 制約: モジュールレベルのシングルトンで状態を管理しているため、
 * 複数の Debounce インスタンスを同時に使用すると clearTimeout が
 * 競合し、先に待っていた方が resolve しなくなる。
 */
function unsafeSuspendForDebounce(key: string, ms: number): void {
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

export function UnsafeSingletonDebounce({
  debounceKey,
  ms,
  children,
}: {
  debounceKey: string;
  ms: number;
  children: React.ReactNode;
}) {
  unsafeSuspendForDebounce(debounceKey, ms);
  return children;
}
