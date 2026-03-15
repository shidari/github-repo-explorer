import { Schema } from "effect";
import { Repository } from "./domain";

// ── 一覧用 DTO（ドメインから pick）──

export const RepoOverview = Repository.pipe(
  Schema.pick(
    "full_name",
    "html_url",
    "owner",
    "description",
    "language",
    "stargazers_count",
  ),
);
export type RepoOverview = typeof RepoOverview.Type;
