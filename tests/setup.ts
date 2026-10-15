import { execFileSync } from "node:child_process";
import path from "node:path";
import { config } from "dotenv";

// Route-boundary tests (tests/route/**) need the same env vars the app reads
// at runtime, pointed at the local Supabase stack started with
// `supabase start`. `.env.test.local` is gitignored, same as `.env.local`.
config({ path: ".env.test.local" });

// A git worktree starts without gitignored files, so fall back to the one in
// the main checkout. dotenv never overrides a variable already set above.
const gitCommonDir = execFileSync(
  "git",
  ["rev-parse", "--path-format=absolute", "--git-common-dir"],
  { encoding: "utf8" },
).trim();
config({ path: path.join(path.dirname(gitCommonDir), ".env.test.local") });
