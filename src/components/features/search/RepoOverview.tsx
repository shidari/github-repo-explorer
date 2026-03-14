import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { RepoOverview as IRepoOverview } from "@/dto";
import styles from "./RepoOverview.module.css";

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function RepoOverview({ repo }: { repo: IRepoOverview }) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Avatar
          src={repo.owner.avatar_url}
          alt={repo.owner.username}
          fallback={repo.owner.username.slice(0, 2).toUpperCase()}
          size="sm"
        />
        <span className={styles.name}>{repo.full_name}</span>
      </div>
      {repo.description && (
        <p className={styles.description}>{repo.description}</p>
      )}
      <div className={styles.meta}>
        {repo.language && <Badge>{repo.language}</Badge>}
        <span className={styles.stat}>
          &#9733; {formatCount(repo.stargazers_count)}
        </span>
      </div>
    </div>
  );
}
