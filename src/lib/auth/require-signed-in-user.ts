import { redirect } from "next/navigation";

type SignedInUser = { email?: string; user_metadata: Record<string, unknown> };

type SessionReader = {
  auth: { getUser(): PromiseLike<{ data: { user: SignedInUser | null } }> };
};

/** Resolves the signed-in User, or redirects a signed-out visitor to the sign-in page. */
export async function requireSignedInUser(supabase: SessionReader): Promise<SignedInUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}
