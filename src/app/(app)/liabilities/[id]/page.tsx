import { notFound } from "next/navigation";
import { LoanDetail } from "@/components/liabilities/LoanDetail";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildLoanDetail } from "@/lib/views/loan-detail";

export default async function LoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = buildLoanDetail(await getPortfolio(), { loanId: id });
  if (!detail) notFound();
  return <LoanDetail detail={detail} />;
}
