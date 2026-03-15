import { Skeleton } from "@/components/ui/skeleton";
import styles from "./page.module.css";

export default function RepoDetailLoading() {
  return (
    <main className={styles.container}>
      <Skeleton
        style={{ width: "8rem", height: "1rem", borderRadius: "0.25rem" }}
      />
      <Skeleton style={{ height: "5rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "4rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "2rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "2rem", borderRadius: "0.5rem" }} />
    </main>
  );
}
