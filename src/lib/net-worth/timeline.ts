import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

export type NetWorthTimelinePoint = {
  date: string;
  holdingsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
};

/** Only the fields the timeline needs from a Holding or Liability — its id
 * and whether/when it was archived. Both `Holding` and `Liability` satisfy
 * this structurally. */
type Owner = { id: string; archived_at: string | null };

type OwnedValuation = { amount: number; fx_rate_to_home: number; recorded_at: string };

function groupByOwner<V extends OwnedValuation>(
  valuations: V[],
  ownerIdOf: (valuation: V) => string,
): Map<string, V[]> {
  const grouped = new Map<string, V[]>();
  for (const valuation of valuations) {
    const ownerId = ownerIdOf(valuation);
    const history = grouped.get(ownerId);
    if (history) history.push(valuation);
    else grouped.set(ownerId, [valuation]);
  }
  for (const history of grouped.values()) {
    history.sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1));
  }
  return grouped;
}

/** One owner's (a Holding's or Liability's) home-currency contribution as of
 * `date`: the most recent Valuation on or before `date`, or 0 if it has none
 * yet, or if `date` falls after the owner was archived — an archived owner
 * keeps contributing for the period it was actually held, then drops out,
 * which is the whole point of archiving rather than deleting (user stories
 * 19-20). */
function contributionAsOf(owner: Owner, history: OwnedValuation[] | undefined, date: string): number {
  if (owner.archived_at !== null && date > owner.archived_at.slice(0, 10)) return 0;

  let latest: OwnedValuation | null = null;
  for (const valuation of history ?? []) {
    if (valuation.recorded_at > date) break;
    latest = valuation;
  }
  return latest ? latest.amount * latest.fx_rate_to_home : 0;
}

/** The recorded Net Worth timeline (user story 55): one point per distinct
 * date any Holding or Liability Valuation was recorded, across *every*
 * Holding/Liability regardless of archival state — archived ones still
 * belong in this trend for the period they were owned (user story 20),
 * unlike `computeNetWorth`'s current-Net-Worth figure, which the caller
 * feeds only active owners' latest Valuations to exclude them (user story
 * 19). Each point forward-fills every owner's latest Valuation as of that
 * date, so a Holding valued only once still shows up at every later point
 * rather than disappearing between check-ins. */
export function buildNetWorthTimeline(
  holdings: Owner[],
  holdingValuations: HoldingValuation[],
  liabilities: Owner[],
  liabilityValuations: LiabilityValuation[],
): NetWorthTimelinePoint[] {
  const holdingHistoryById = groupByOwner(holdingValuations, (v) => v.holding_id);
  const liabilityHistoryById = groupByOwner(liabilityValuations, (v) => v.liability_id);

  const dates = new Set<string>();
  for (const valuation of holdingValuations) dates.add(valuation.recorded_at);
  for (const valuation of liabilityValuations) dates.add(valuation.recorded_at);

  return [...dates].sort().map((date) => {
    const holdingsTotal = holdings.reduce(
      (sum, holding) => sum + contributionAsOf(holding, holdingHistoryById.get(holding.id), date),
      0,
    );
    const liabilitiesTotal = liabilities.reduce(
      (sum, liability) => sum + contributionAsOf(liability, liabilityHistoryById.get(liability.id), date),
      0,
    );
    return { date, holdingsTotal, liabilitiesTotal, netWorth: holdingsTotal - liabilitiesTotal };
  });
}
