import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import type { Repository } from "@/domain";
import styles from "./RepoDetail.module.css";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function RepoDetail({ repo }: { repo: Repository }) {
  return (
    <ItemGroup>
      <Item>
        <ItemMedia>
          <Avatar
            src={repo.owner.avatar_url}
            alt={repo.owner.username}
            fallback={repo.owner.username.slice(0, 2).toUpperCase()}
            size="lg"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{repo.full_name}</ItemTitle>
          {repo.description && (
            <ItemDescription>{repo.description}</ItemDescription>
          )}
        </ItemContent>
      </Item>

      <ItemSeparator />

      <div className={styles.stats}>
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{repo.stargazers_count.toLocaleString()}</ItemTitle>
            <ItemDescription>Stars</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{repo.watchers_count.toLocaleString()}</ItemTitle>
            <ItemDescription>Watchers</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{repo.forks_count.toLocaleString()}</ItemTitle>
            <ItemDescription>Forks</ItemDescription>
          </ItemContent>
        </Item>
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{repo.open_issues_count.toLocaleString()}</ItemTitle>
            <ItemDescription>Issues</ItemDescription>
          </ItemContent>
        </Item>
      </div>

      <ItemSeparator />

      <div className={styles.details}>
        {repo.language && <Label term="Language">{repo.language}</Label>}
        {repo.license && <Label term="License">{repo.license.name}</Label>}
        <Label term="Branch">{repo.default_branch}</Label>
        {repo.archived && (
          <Label term="Status">
            <Badge>Archived</Badge>
          </Label>
        )}
      </div>

      {repo.topics.length > 0 && (
        <>
          <ItemSeparator />
          <div className={styles.details}>
            <Label term="Topics">
              <span className={styles.badges}>
                {repo.topics.map((topic) => (
                  <Badge key={topic}>{topic}</Badge>
                ))}
              </span>
            </Label>
          </div>
        </>
      )}

      <ItemSeparator />

      <div className={styles.details}>
        <Label term="Links">
          <span className={styles.links}>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.externalLink}
            >
              GitHub
            </a>
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                Homepage
              </a>
            )}
          </span>
        </Label>
      </div>

      <ItemSeparator />

      <div className={styles.details}>
        <Label term="Created">{formatDate(repo.created_at)}</Label>
        <Label term="Updated">{formatDate(repo.updated_at)}</Label>
      </div>
    </ItemGroup>
  );
}
