import { Arbitrary, FastCheck as fc } from "effect";
import { Repository } from "@/domain/index";

// seed を固定して再現性を保証（検索と詳細で同じデータセットになる）
export const mockTestRepos = fc
  .sample(Arbitrary.make(Repository), { numRuns: 200, seed: 42 })
  .filter(function uniqueByFullName(item, index, arr) {
    return arr.findIndex((x) => x.full_name === item.full_name) === index;
  });
