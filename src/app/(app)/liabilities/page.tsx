import { LiabilitiesPage } from "@/components/liabilities/LiabilitiesPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildLiabilities } from "@/lib/views/liabilities";

export default async function Page() {
  return <LiabilitiesPage view={buildLiabilities(await getPortfolio())} />;
}
