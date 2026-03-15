import { Schema } from "effect";
import {
  mockAvatarUrl,
  mockHttpsUrl,
  mockLicense,
  mockOwner,
  mockRepository,
} from "./mock";

// ── 共通 ──

const HttpsUrl = Schema.String.pipe(
  Schema.filter((s) => URL.canParse(s) && s.startsWith("https://"), {
    message: () => "有効な HTTPS URL ではありません",
  }),
).annotations({
  arbitrary: mockHttpsUrl,
});

// ── Owner ──

export const Owner = Schema.Struct({
  username: Schema.NonEmptyString,
  avatar_url: HttpsUrl.annotations({
    arbitrary: mockAvatarUrl,
  }),
}).annotations({
  identifier: "Owner",
  title: "Repository Owner",
  arbitrary: mockOwner,
});
export type Owner = typeof Owner.Type;

// ── License ──

export const License = Schema.Struct({
  key: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
}).annotations({
  identifier: "License",
  title: "Repository License",
  arbitrary: mockLicense,
});
export type License = typeof License.Type;

// ── Repository ──

export const Repository = Schema.Struct({
  full_name: Schema.NonEmptyString,
  html_url: HttpsUrl,
  owner: Owner,
  description: Schema.optional(Schema.NonEmptyString),
  language: Schema.NullOr(Schema.NonEmptyString),
  stargazers_count: Schema.NonNegativeInt,
  watchers_count: Schema.NonNegativeInt,
  forks_count: Schema.NonNegativeInt,
  open_issues_count: Schema.NonNegativeInt,
  topics: Schema.Array(Schema.NonEmptyString),
  license: Schema.optional(License),
  homepage: Schema.optional(
    Schema.String.pipe(
      Schema.filter((s) => URL.canParse(s), {
        message: () => "有効な URL ではありません",
      }),
    ),
  ),
  default_branch: Schema.NonEmptyString,
  archived: Schema.Boolean,
  created_at: Schema.Date,
  updated_at: Schema.Date,
}).annotations({
  identifier: "Repository",
  title: "GitHub Repository",
  arbitrary: mockRepository,
});
export type Repository = typeof Repository.Type;
