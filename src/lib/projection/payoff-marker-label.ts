import { formatMoney } from "@/lib/currency/format";
import type { ChartPayoffMarker } from "@/components/portfolio/NetWorthTimelineChart";
import type { PayoffMarker } from "./engine";

/** "Mortgage paid off · +3,155/mo" (user story 76's example) — the marker's
 * own redirect disclosure (user story 77: "disclosed... in the marker
 * labels"), so a reader never needs a legend to know why the line bends. */
export function formatPayoffMarkerLabel(
  marker: PayoffMarker,
  liabilityName: string,
  homeCurrency: string,
): string {
  return `${liabilityName} paid off · +${formatMoney(marker.freedAmount, homeCurrency)}/mo`;
}

/** `PayoffMarker[]` (engine output, keyed by Liability id) into
 * `NetWorthTimelineChart`'s `ChartPayoffMarker[]` (a month offset plus a
 * rendered label) — shared by the dashboard (saved assumptions) and the
 * Plan page (the live draft), which would otherwise repeat this exact
 * `.map()`. */
export function toChartPayoffMarkers(
  markers: PayoffMarker[],
  liabilityNames: Map<string, string>,
  homeCurrency: string,
): ChartPayoffMarker[] {
  return markers.map((marker) => ({
    monthsFromToday: marker.monthsFromToday,
    label: formatPayoffMarkerLabel(marker, liabilityNames.get(marker.liabilityId) ?? "Liability", homeCurrency),
  }));
}
