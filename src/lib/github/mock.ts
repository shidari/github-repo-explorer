import { Arbitrary, FastCheck as fc } from "effect";
import { Repository } from "@/domain/index";

export const mockTestRepos = fc.sample(Arbitrary.make(Repository), 100);
