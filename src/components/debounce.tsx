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
 *
 * 制約: モジュールレベルのシングルトンで状態を管理しているため、
 * 複数の Debounce インスタンスを同時に使用すると clearTimeout が
 * 競合し、先に待っていた方が resolve しなくなる。
 * 現状は1箇所でのみ使用する前提。複数インスタンス対応は
 * Map によるタイマー管理が必要だが、クリーンアップの複雑さから見送った。
 * React 19 の use() がクライアントの手動 Promise をサポートしたら置き換える。
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
