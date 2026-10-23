import { GrowthPage } from "@/components/growth/GrowthPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { buildAssumptions } from "@/lib/views/projection-assumptions";

export default async function GrowthRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = parseGrowthView(await searchParams);
  const data = await getPortfolio();
  return <GrowthPage growth={buildGrowth(data, view)} assumptions={buildAssumptions(data, view)} />;
}
