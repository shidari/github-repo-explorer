import { Context, Data, Effect, Layer, Schema } from "effect";
import type { Repository } from "@/domain";
import { RepoOverview } from "@/dto";
import { mockTestRepos } from "./mock";

// ── エラー ──

export class RepoNotFoundError extends Data.TaggedError("RepoNotFoundError")<{
  owner: string;
  repo: string;
}> {}

export class SearchNoResultError extends Data.TaggedError("SearchNoResultError")<{
  query: string;
}> {}

export class PageOutOfRangeError extends Data.TaggedError("PageOutOfRangeError")<{
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
    }) => Effect.Effect<SearchReposResult, SearchNoResultError | PageOutOfRangeError>;
  }
>() {
  static readonly Test = Layer.succeed(SearchReposQuery, {
    runAction: ({ query, page, perPage }) =>
      Effect.gen(function* () {
        const filtered = mockTestRepos.filter(
          (r) =>
            r.full_name.toLowerCase().includes(query.toLowerCase()) ||
            (r.description?.toLowerCase().includes(query.toLowerCase()) ?? false),
        );
        if (filtered.length === 0) {
          return yield* Effect.fail(new SearchNoResultError({ query }));
        }
        const totalPages = Math.ceil(filtered.length / perPage);
        if (page > totalPages) {
          return yield* Effect.fail(new PageOutOfRangeError({ page, totalPages }));
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

export class GetRepoByFullNameQuery extends Context.Tag("GetRepoByFullNameQuery")<
  GetRepoByFullNameQuery,
  {
    readonly runAction: (params: {
      owner: string;
      repo: string;
    }) => Effect.Effect<Repository, RepoNotFoundError>;
  }
>() {
  static readonly Test = Layer.succeed(GetRepoByFullNameQuery, {
    runAction: ({ owner, repo }) => {
      const found = mockTestRepos.find(
        (r) =>
          r.owner.username.toLowerCase() === owner.toLowerCase() &&
          r.full_name.split("/")[1].toLowerCase() === repo.toLowerCase(),
      );
      return found
        ? Effect.succeed(found)
        : Effect.fail(new RepoNotFoundError({ owner, repo }));
    },
  });
}
