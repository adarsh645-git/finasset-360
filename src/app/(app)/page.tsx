import { Overview } from "@/components/overview/Overview";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildOverview, parseRange } from "@/lib/views/overview";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const { range } = await searchParams;
  const overview = buildOverview(await getPortfolio(), { range: parseRange(range) });
  return <Overview overview={overview} />;
}
