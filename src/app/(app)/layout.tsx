import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ShellFrame } from "@/components/shell/ShellFrame";
import { requireSignedInUser } from "@/lib/auth/require-signed-in-user";
import { createClient } from "@/lib/supabase/server";
import { resolveTheme, THEME_COOKIE } from "@/lib/theme";
import { buildShell } from "@/lib/views/shell";

// Every signed-in page renders inside the shell; a visitor without a session
// goes to /login. The login page lives outside this group.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireSignedInUser(await createClient());
  const theme = resolveTheme((await cookies()).get(THEME_COOKIE)?.value);
  // Active item is applied in ShellFrame from usePathname, which layouts can't read.
  const shell = buildShell({ user }, { pathname: null });
  return (
    <ShellFrame shell={shell} theme={theme}>
      {children}
    </ShellFrame>
  );
}
