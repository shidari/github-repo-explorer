import Link from "next/link";
import { createClient } from "@/client";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import styles from "./page.module.css";

const client = createClient(
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
);

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  const res = await client.api.repos[":owner"][":repo"].$get({
    param: { owner, repo },
  });

  if (!res.ok) {
    return (
      <main className={styles.container}>
        <p className={styles.notFound}>
          {owner}/{repo} not found
        </p>
        <Link href="/search" className={styles.backLink}>
          Back to search
        </Link>
      </main>
    );
  }

  const data = await res.json();

  return (
    <main className={styles.container}>
      <Link href="/search" className={styles.backLink}>
        &larr; Back to search
      </Link>

      <ItemGroup>
        <Item>
          <ItemMedia>
            <Avatar
              src={data.owner.avatar_url}
              alt={data.owner.username}
              fallback={data.owner.username.slice(0, 2).toUpperCase()}
              size="lg"
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{data.full_name}</ItemTitle>
            {data.description && (
              <ItemDescription>{data.description}</ItemDescription>
            )}
          </ItemContent>
        </Item>

        <ItemSeparator />

        <div className={styles.stats}>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{data.stargazers_count.toLocaleString()}</ItemTitle>
              <ItemDescription>Stars</ItemDescription>
            </ItemContent>
          </Item>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{data.watchers_count.toLocaleString()}</ItemTitle>
              <ItemDescription>Watchers</ItemDescription>
            </ItemContent>
          </Item>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{data.forks_count.toLocaleString()}</ItemTitle>
              <ItemDescription>Forks</ItemDescription>
            </ItemContent>
          </Item>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{data.open_issues_count.toLocaleString()}</ItemTitle>
              <ItemDescription>Issues</ItemDescription>
            </ItemContent>
          </Item>
        </div>

        <ItemSeparator />

        <Item>
          <ItemContent>
            <ItemFooter>
              {data.language && <Badge>{data.language}</Badge>}
              {data.license && <Badge>{data.license.name}</Badge>}
              {data.archived && <Badge>Archived</Badge>}
              <span className={styles.branch}>{data.default_branch}</span>
            </ItemFooter>
          </ItemContent>
        </Item>

        {data.topics.length > 0 && (
          <>
            <ItemSeparator />
            <Item>
              <ItemContent>
                <ItemFooter>
                  {data.topics.map((topic) => (
                    <Badge key={topic}>{topic}</Badge>
                  ))}
                </ItemFooter>
              </ItemContent>
            </Item>
          </>
        )}

        <ItemSeparator />

        <Item>
          <ItemContent>
            <ItemFooter>
              <a
                href={data.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.externalLink}
              >
                View on GitHub
              </a>
              {data.homepage && (
                <a
                  href={data.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.externalLink}
                >
                  Homepage
                </a>
              )}
            </ItemFooter>
          </ItemContent>
        </Item>

        <ItemSeparator />

        <Item>
          <ItemContent>
            <ItemFooter>
              <span className={styles.date}>
                Created: {new Date(data.created_at).toLocaleDateString()}
              </span>
              <span className={styles.date}>
                Updated: {new Date(data.updated_at).toLocaleDateString()}
              </span>
            </ItemFooter>
          </ItemContent>
        </Item>
      </ItemGroup>
    </main>
  );
}
