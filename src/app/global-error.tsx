"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body>
        <main
          style={{
            maxWidth: "48rem",
            margin: "0 auto",
            padding: "2rem 1rem",
            textAlign: "center",
          }}
        >
          <h1>エラーが発生しました</h1>
          <p>予期しないエラーが発生しました。再試行してください。</p>
          <button type="button" onClick={reset}>
            再試行
          </button>
        </main>
      </body>
    </html>
  );
}
