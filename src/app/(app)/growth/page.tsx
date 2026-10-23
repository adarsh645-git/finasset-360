import { GrowthPage } from "@/components/growth/GrowthPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";

export default async function GrowthRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = parseGrowthView(await searchParams);
  return <GrowthPage growth={buildGrowth(await getPortfolio(), view)} />;
}
