import { Skeleton } from "@/components/ui/skeleton";
import styles from "./page.module.css";

export default function RepoDetailLoading() {
  return (
    <main className={styles.container}>
      <Skeleton
        style={{ width: "8rem", height: "1rem", borderRadius: "0.25rem" }}
      />
      <Skeleton style={{ height: "8rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "6rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "3rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "3rem", borderRadius: "0.5rem" }} />
      <Skeleton style={{ height: "3rem", borderRadius: "0.5rem" }} />
    </main>
  );
}
