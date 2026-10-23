import { notFound } from "next/navigation";
import { HoldingDetail } from "@/components/holding/HoldingDetail";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildHoldingDetail } from "@/lib/views/holding-detail";

export default async function HoldingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = buildHoldingDetail(await getPortfolio(), { holdingId: id });
  if (!detail) notFound();
  return <HoldingDetail detail={detail} />;
}
