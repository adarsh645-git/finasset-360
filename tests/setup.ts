import { config } from "dotenv";

// Route-boundary tests (tests/route/**) need the same env vars the app reads
// at runtime, pointed at the local Supabase stack started with
// `supabase start`. `.env.test.local` is gitignored, same as `.env.local`.
config({ path: ".env.test.local" });
