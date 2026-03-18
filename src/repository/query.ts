import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { Context, Data, Effect, Layer, Schema } from "effect";
import { Repository } from "@/domain";
import { RepoOverview } from "@/dto";
import { mockTestRepos } from "./mock";

// ── GitHub API クライアント ──

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * GitHub Search API は最大1000件までしか返さない
 * @see https://docs.github.com/en/rest/search/search
 */
export const GITHUB_SEARCH_MAX_RESULTS = 1000;

// ── エラー ──

export class RepoNotFoundError extends Data.TaggedError("RepoNotFoundError")<{
  owner: string;
  repo: string;
}> {}

export class SearchNoResultError extends Data.TaggedError(
  "SearchNoResultError",
)<{
  query: string;
}> {}

// GitHub Search API: GET /search/repositories
// @see https://docs.github.com/en/rest/search/search#search-repositories
// @see https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
//   403 / 429 — rate limit 超過（認証なし: 10req/min、認証あり: 30req/min）
//   422 — バリデーションエラー（不正なクエリ構文等）
//   503 — サービス一時不可
// TODO: Unexpected をつけたが命名引き続き検討中
export class SearchApiUnexpectedError extends Data.TaggedError(
  "SearchApiUnexpectedError",
)<{
  reason: "rateLimit" | "validation" | "serviceUnavailable" | "unknown";
  message: string;
}> {}

// GitHub Repos API: GET /repos/{owner}/{repo}
// @see https://docs.github.com/en/rest/repos/repos#get-a-repository
// @see https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
//   403 / 429 — rate limit 超過
// TODO: Unexpected をつけたが命名引き続き検討中
export class ReposApiUnexpectedError extends Data.TaggedError(
  "ReposApiUnexpectedError",
)<{
  reason: "rateLimit" | "unknown";
  message: string;
}> {}

export type GitHubApiError = SearchApiUnexpectedError | ReposApiUnexpectedError;

export type GitHubSearchReposError =
  | SearchNoResultError
  | PageOutOfRangeError
  | SearchApiUnexpectedError;
export type GitHubGetRepoError = RepoNotFoundError | ReposApiUnexpectedError;

export class PageOutOfRangeError extends Data.TaggedError(
  "PageOutOfRangeError",
)<{
  page: number;
  totalPages: number;
}> {}

// ── レスポンス ──

export const SearchReposResult = Schema.Struct({
  total_count: Schema.NonNegativeInt,
  items: Schema.Array(RepoOverview),
});
export type SearchReposResult = typeof SearchReposResult.Type;

// ── 検索 ──

export class SearchReposQuery extends Context.Tag("SearchReposQuery")<
  SearchReposQuery,
  {
    readonly runAction: (params: {
      query: string;
      page: number;
      perPage: number;
    }) => Effect.Effect<SearchReposResult, GitHubSearchReposError>;
  }
>() {
  static readonly main = Layer.succeed(SearchReposQuery, {
    runAction: ({ query, page, perPage }) =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () =>
            octokit.search.repos({
              q: query,
              page,
              per_page: perPage,
            }),
          catch: (err) => {
            const status = err instanceof RequestError ? err.status : 500;
            const message = err instanceof Error ? err.message : String(err);
            console.error("[SearchReposQuery] GitHub API error:", {
              status,
              message,
              query,
              page,
            });
            const reason = (() => {
              switch (status) {
                case 403:
                case 429:
                  return "rateLimit" as const;
                case 422:
                  return "validation" as const;
                case 503:
                  return "serviceUnavailable" as const;
                default:
                  return "unknown" as const;
              }
            })();
            return new SearchApiUnexpectedError({ reason, message });
          },
        });

        const { total_count, items } = res.data;

        if (total_count === 0) {
          return yield* Effect.fail(new SearchNoResultError({ query }));
        }

        const effectiveCount = Math.min(total_count, GITHUB_SEARCH_MAX_RESULTS);
        const totalPages = Math.ceil(effectiveCount / perPage);
        if (page > totalPages) {
          return yield* Effect.fail(
            new PageOutOfRangeError({ page, totalPages }),
          );
        }

        return yield* Schema.decodeUnknown(SearchReposResult)({
          total_count,
          items: items.map((item) => ({
            full_name: item.full_name,
            html_url: item.html_url,
            owner: {
              username: item.owner?.login ?? "",
              avatar_url: item.owner?.avatar_url ?? "",
            },
            description: item.description ?? undefined,
            language: item.language ?? null,
            stargazers_count: item.stargazers_count,
          })),
        }).pipe(Effect.orDie);
      }),
  });

  static readonly test = Layer.succeed(SearchReposQuery, {
    runAction: ({ query, page, perPage }) =>
      Effect.gen(function* () {
        yield* Effect.sleep("250 millis");
        // GitHub API のデフォルト検索は name + description + topics
        // https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories
        // テスト用モックでは full_name + description の部分一致に簡略化
        const q = query.toLowerCase();
        const filtered = mockTestRepos.filter(
          ({ full_name, description }) =>
            full_name.toLowerCase().includes(q) ||
            (description?.toLowerCase().includes(q) ?? false),
        );
        if (filtered.length === 0) {
          return yield* Effect.fail(new SearchNoResultError({ query }));
        }
        const totalPages = Math.ceil(filtered.length / perPage);
        if (page > totalPages) {
          return yield* Effect.fail(
            new PageOutOfRangeError({ page, totalPages }),
          );
        }
        const start = (page - 1) * perPage;
        return yield* Schema.decodeUnknown(SearchReposResult)({
          total_count: filtered.length,
          items: filtered.slice(start, start + perPage),
        }).pipe(Effect.orDie);
      }),
  });
}

// ── 詳細取得 ──

export class GetRepoByFullNameQuery extends Context.Tag(
  "GetRepoByFullNameQuery",
)<
  GetRepoByFullNameQuery,
  {
    readonly runAction: (params: {
      owner: string;
      repo: string;
    }) => Effect.Effect<
      Repository,
      RepoNotFoundError | ReposApiUnexpectedError
    >;
  }
>() {
  static readonly main = Layer.succeed(GetRepoByFullNameQuery, {
    runAction: ({ owner, repo }) =>
      Effect.gen(function* () {
        const res = yield* Effect.tryPromise({
          try: () => octokit.repos.get({ owner, repo }),
          catch: (err) => {
            if (err instanceof RequestError && err.status === 404) {
              return new RepoNotFoundError({ owner, repo });
            }
            const status = err instanceof RequestError ? err.status : 500;
            const message = err instanceof Error ? err.message : String(err);
            console.error("[GetRepoByFullNameQuery] GitHub API error:", {
              status,
              message,
              owner,
              repo,
            });
            const reason = (() => {
              switch (status) {
                case 403:
                case 429:
                  return "rateLimit" as const;
                default:
                  return "unknown" as const;
              }
            })();
            return new ReposApiUnexpectedError({ reason, message });
          },
        });

        const r = res.data;

        return yield* Schema.decodeUnknown(Repository)({
          full_name: r.full_name,
          html_url: r.html_url,
          owner: {
            username: r.owner?.login ?? "",
            avatar_url: r.owner?.avatar_url ?? "",
          },
          description: r.description ?? undefined,
          language: r.language ?? null,
          stargazers_count: r.stargazers_count,
          watchers_count: r.watchers_count,
          forks_count: r.forks_count,
          open_issues_count: r.open_issues_count,
          topics: r.topics ?? [],
          license: r.license
            ? { key: r.license.key, name: r.license.name ?? r.license.key }
            : undefined,
          homepage: r.homepage || undefined,
          default_branch: r.default_branch,
          archived: r.archived,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }).pipe(Effect.orDie);
      }),
  });

  static readonly test = Layer.succeed(GetRepoByFullNameQuery, {
    runAction: ({ owner, repo }) =>
      Effect.gen(function* () {
        yield* Effect.sleep("250 millis");
        const found = mockTestRepos.find(
          (r) =>
            r.owner.username.toLowerCase() === owner.toLowerCase() &&
            r.full_name.split("/")[1].toLowerCase() === repo.toLowerCase(),
        );
        return found
          ? found
          : yield* Effect.fail(new RepoNotFoundError({ owner, repo }));
      }),
  });
}
