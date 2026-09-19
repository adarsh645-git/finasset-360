import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_ASSET_CLASS_ID, isCashAssetClass } from "@/lib/asset-classes/defaults";
import type { AssetClass, Holding } from "@/components/portfolio/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { HoldingDetailPanel } = await import("@/components/portfolio/HoldingDetailPanel");

const ASSET_CLASSES: AssetClass[] = [
  { id: DEFAULT_ASSET_CLASS_ID.equity, owner_id: null, name: "Equity" },
  { id: DEFAULT_ASSET_CLASS_ID.cash, owner_id: null, name: "Cash" },
];

function holdingIn(assetClassId: string, overrides: Partial<Holding> = {}): Holding {
  return {
    id: "h1",
    asset_class_id: assetClassId,
    name: "Chase Checking",
    currency: "USD",
    price_lookup_symbol: null,
    quantity: null,
    sector: null,
    held_at: null,
    archived_at: null,
    created_at: "2026-09-13T00:00:00Z",
    ...overrides,
  };
}

function renderDetail(holding: Holding) {
  return renderToStaticMarkup(
    <HoldingDetailPanel
      holding={holding}
      assetClasses={ASSET_CLASSES}
      latestValuation={null}
      history={[]}
      priceCache={null}
      today="2026-09-13"
      projectionAssumptions={null}
      linkedLiabilities={[]}
      netPosition={null}
      onRecordValuation={async () => null}
      onSave={async () => null}
      onArchive={async () => null}
      onDelete={async () => null}
    />,
  );
}

describe("isCashAssetClass", () => {
  it("is true only for the default Cash class id", () => {
    expect(isCashAssetClass(DEFAULT_ASSET_CLASS_ID.cash)).toBe(true);
    expect(isCashAssetClass(DEFAULT_ASSET_CLASS_ID.equity)).toBe(false);
    // A custom class is never Cash-shaped, whatever it's named.
    expect(isCashAssetClass("11111111-1111-1111-1111-111111111111")).toBe(false);
  });
});

describe("Holding detail form", () => {
  it("hides Market symbol and Quantity for a Cash Holding", () => {
    const html = renderDetail(holdingIn(DEFAULT_ASSET_CLASS_ID.cash));
    expect(html).not.toContain("Market symbol");
    expect(html).not.toContain("Quantity");
    expect(html).toContain("Held at");
    expect(html).toContain("Currency");
  });

  it("keeps Market symbol and Quantity for other Asset Classes", () => {
    const html = renderDetail(holdingIn(DEFAULT_ASSET_CLASS_ID.equity));
    expect(html).toContain("Market symbol");
    expect(html).toContain("Quantity");
  });
});
