"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PositionDrawerPanel } from "@/components/holding/PositionDrawerPanel";
import type { PortfolioData } from "@/lib/read-model/types";
import { buildPositionDrawer, drawerCloseHref } from "@/lib/views/position-drawer";

// Mounted once in the (app) layout: any page whose URL carries
// `position=<holdingId>~<ticker>` opens the drawer. Closing removes only `position`.
export function DrawerHost({ data }: { data: PortfolioData }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const drawer = buildPositionDrawer(data, params.get("position"));
  if (!drawer) return null;
  const closeHref = drawerCloseHref(pathname, params.toString());
  return (
    <PositionDrawerPanel drawer={drawer} closeHref={closeHref} onClose={() => router.replace(closeHref)} />
  );
}
