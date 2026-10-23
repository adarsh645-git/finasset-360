import { notFound } from "next/navigation";
import { AssetClassPage } from "@/components/assets/AssetClassPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildAssetClassView, classIdOfSlug } from "@/lib/views/asset-class";

export default async function Page({ params }: { params: Promise<{ class: string }> }) {
  const id = classIdOfSlug((await params).class);
  if (!id) notFound();
  return <AssetClassPage view={buildAssetClassView(await getPortfolio(), id)} />;
}
