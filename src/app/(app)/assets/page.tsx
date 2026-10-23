import { AssetsPage } from "@/components/assets/AssetsPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";

export default async function Page() {
  return <AssetsPage data={await getPortfolio()} />;
}
