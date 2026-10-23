import { describe, expect, it } from "vitest";
import { buildHoldingDetail } from "@/lib/views/holding-detail";
import { EXISTING_ROUTES } from "@/lib/views/links";
import { holding, portfolio } from "../fixtures/portfolio";

describe("holding detail delete", () => {
  const data = portfolio({
    today: "2026-10-13",
    holdings: [holding({ id: "c1", assetClass: "cash", name: "Chase Checking", currentValue: 5_000 })],
  });

  it("AC-22 Delete lands on the class page", () => {
    expect(buildHoldingDetail(data, { holdingId: "c1" })!.afterArchive).toBe("/assets/cash");
  });

  it("AC-22 without class pages it falls back to the Overview", () => {
    const existing = new Set([...EXISTING_ROUTES].filter((f) => f !== "assetClass"));
    expect(buildHoldingDetail(data, { holdingId: "c1", existing })!.afterArchive).toBe("/");
  });
});
