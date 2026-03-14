import { Schema } from "effect";
import { mockAvatarUrl, mockOwner, mockRepository } from "./mock";

// ── Owner ──

export const Owner = Schema.Struct({
  username: Schema.String,
  avatar_url: Schema.String.pipe(
    Schema.filter((s) => URL.canParse(s) && s.startsWith("https://"), {
      message: () => "有効な HTTPS URL ではありません",
    }),
  ).annotations({
    arbitrary: mockAvatarUrl,
  }),
}).annotations({
  identifier: "Owner",
  title: "Repository Owner",
  arbitrary: mockOwner,
});
export type Owner = typeof Owner.Type;

// ── Repository ──

export const Repository = Schema.Struct({
  full_name: Schema.String,
  owner: Owner,
  description: Schema.NullOr(Schema.String),
  language: Schema.NullOr(Schema.String),
  stargazers_count: Schema.NonNegativeInt,
  watchers_count: Schema.NonNegativeInt,
  forks_count: Schema.NonNegativeInt,
  open_issues_count: Schema.NonNegativeInt,
  updated_at: Schema.Date,
}).annotations({
  identifier: "Repository",
  title: "GitHub Repository",
  arbitrary: mockRepository,
});
export type Repository = typeof Repository.Type;
