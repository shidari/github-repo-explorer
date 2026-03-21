/**
 * 0 から無限に1ずつ増え続ける自然数列。
 *
 * @example
 * [...naturals().take(5)] // [0, 1, 2, 3, 4]
 */
export function* naturals() {
  for (let i = 0; ; i++) {
    yield i;
  }
}
