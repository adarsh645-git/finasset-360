// Fails fast with a clear message rather than letting `createClient` throw an
// opaque error deep inside a request, since a missing env var is otherwise a
// silent misconfiguration until the first request hits it.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in (see \`supabase start\` output for local values).`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}
