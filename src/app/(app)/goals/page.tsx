import { GoalsPage } from "@/components/goals/GoalsPage";
import { getPortfolio } from "@/lib/read-model/get-portfolio";
import { buildGoalsPage } from "@/lib/views/goals";

export default async function GoalsRoute() {
  return <GoalsPage page={buildGoalsPage(await getPortfolio())} />;
}
