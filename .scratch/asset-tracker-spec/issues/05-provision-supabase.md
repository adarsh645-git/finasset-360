Type: task

## Question

Provision the Supabase project this app will run on, and enable Google as an Auth provider, so later tickets and the eventual build have somewhere real to point at.

Checklist for the human (only they can do this — external account/service setup):
1. Create a Supabase account and a new project (free tier).
2. In Supabase Auth settings, enable the Google provider.
3. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application), add the Supabase-provided redirect URI, and paste the resulting Client ID + Secret into Supabase's Google provider config.
4. Record: the Supabase project URL, the anon/public API key, and (kept out of any committed file) the service-role key location — e.g. a password manager entry or local `.env` not checked in.

Resolve this ticket once the project exists and Google sign-in works end-to-end from Supabase's own auth test/preview.
