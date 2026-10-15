import { firstNameOrEmail } from "@/lib/auth/display-name";
import { SignOutButton } from "@/components/SignOutButton";

// Interim home page (design D18): says the app is being rebuilt and shows no
// figures. redesign-shell-and-overview replaces it.
export function InterimHome({
  user,
}: {
  user: { email?: string; user_metadata: Record<string, unknown> };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">FinAsset 360 is being rebuilt</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Signed in as {firstNameOrEmail(user)}. Your Portfolio screens are on their way back.
      </p>
      <div>
        <SignOutButton />
      </div>
    </main>
  );
}
