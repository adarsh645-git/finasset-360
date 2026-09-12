// Fails fast with a clear message rather than letting `createClient` throw an
// opaque error deep inside a request, since a missing env var is otherwise a
// silent misconfiguration until the first request hits it.
//
// Takes the value pre-resolved (rather than looking it up by name via
// `process.env[name]`) because these two are NEXT_PUBLIC_ vars read from
// client-bundled code: Next.js inlines `process.env.NEXT_PUBLIC_X` at build
// time via static text substitution, which only fires on that literal
// member-expression form — `process.env[name]` with a dynamic name is
// invisible to it, so it silently resolves to nothing in the browser bundle.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in (see \`supabase start\` output for local values).`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
