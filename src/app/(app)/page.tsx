import { InterimHome } from "@/components/InterimHome";
import { requireSignedInUser } from "@/lib/auth/require-signed-in-user";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const user = await requireSignedInUser(await createClient());
  return <InterimHome user={user} />;
}
