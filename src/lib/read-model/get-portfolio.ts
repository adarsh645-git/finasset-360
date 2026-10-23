import { cache } from "react";
import { todayIsoDate } from "@/lib/date/today";
import { createClient } from "@/lib/supabase/server";
import { loadPortfolio } from "./load-portfolio";
import type { PortfolioData } from "./types";

/** The signed-in User's Portfolio, read once per request however many server components ask (design.md D17). */
export const getPortfolio = cache(async (): Promise<PortfolioData> => {
  return loadPortfolio(await createClient(), todayIsoDate());
});
