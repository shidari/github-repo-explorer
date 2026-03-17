import styles from "./page.module.css";

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className={styles.container}>
      {children}
    </main>
  );
}
