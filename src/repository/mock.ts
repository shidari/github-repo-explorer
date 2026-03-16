import { Arbitrary, FastCheck as fc } from "effect";
import { Repository } from "@/domain/index";

export const mockTestRepos = fc
  .sample(Arbitrary.make(Repository), 200)
  .filter(
    (r, i, arr) => arr.findIndex((x) => x.full_name === r.full_name) === i,
  )
  .slice(0, 100);
