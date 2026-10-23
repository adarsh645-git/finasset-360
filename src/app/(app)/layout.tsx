import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ProjectionProvider } from "@/components/chart/ProjectionProvider";
import { ShellFrame } from "@/components/shell/ShellFrame";
import { requireSignedInUser } from "@/lib/auth/require-signed-in-user";
import { DEFAULT_HORIZON_YEARS } from "@/lib/calc";
import { PROJECTION_COOKIE, resolveProjection } from "@/lib/chart/projection";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { createClient } from "@/lib/supabase/server";
import { resolveTheme, THEME_COOKIE } from "@/lib/theme";
import { buildShell } from "@/lib/views/shell";

// Every signed-in page renders inside the shell; a visitor without a session
// goes to /login. The login page lives outside this group.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireSignedInUser(await createClient());
  const jar = await cookies();
  const theme = resolveTheme(jar.get(THEME_COOKIE)?.value);
  const projection = resolveProjection(jar.get(PROJECTION_COOKIE)?.value);
  // Active item is applied in ShellFrame from usePathname, which layouts can't read.
  const portfolio = await getPortfolio();
  const shell = buildShell({ user, portfolio }, { pathname: null });
  return (
    <ShellFrame shell={shell} theme={theme}>
      <ProjectionProvider
        initial={projection}
        horizon={portfolio.assumptions.horizonYears ?? DEFAULT_HORIZON_YEARS}
      >
        {children}
      </ProjectionProvider>
    </ShellFrame>
  );
}
