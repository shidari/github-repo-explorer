import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "./_header";
import "./globals.css";
import styles from "./layout.module.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GitHub Repo Explorer",
    template: "%s | GitHub Repo Explorer",
  },
  description: "GitHub リポジトリの情報を検索・閲覧できる Web アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a href="#main-content" className={styles.skipLink}>
          コンテンツへスキップ
        </a>
        <Header />
        {children}
      </body>
    </html>
  );
}
