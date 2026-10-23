import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { initialEdit, saveHolding } = await import("@/lib/views/holding-entry");
const { stepSaveOptions, stepFocus } = await import("@/lib/views/update-pass");
const { holding } = await import("../fixtures/portfolio");

const fidelity = holding({
  id: "s1",
  name: "Fidelity Brokerage",
  positions: [
    { ticker: "AAPL", shares: 30, avgCost: 165, price: 232.1, priceSource: "hand", priceAsOf: "2026-09-26", name: "Apple Inc.", sector: "Technology", exchange: "NASDAQ" },
    { ticker: "TDF", shares: 5, avgCost: 10, price: 12, priceSource: "hand", priceAsOf: "2026-08-27", name: "TDF", sector: "Other", exchange: "" },
  ],
});

/** What the form sends for an unchanged Edit positions save. */
async function sentBody(inPass: boolean): Promise<Record<string, unknown>> {
  let body: Record<string, unknown> = {};
  const fetchFn = (async (_url: string, init: { body: string }) => {
    body = JSON.parse(init.body);
    return new Response(JSON.stringify({ id: "s1" }), { status: 200 });
  }) as unknown as Parameters<typeof saveHolding>[0];
  const saved = await saveHolding(fetchFn, initialEdit(fidelity), "s1", stepSaveOptions("edit-positions", inPass));
  expect(saved.ok).toBe(true);
  return body;
}

describe("the Edit positions step", () => {
  it("UP-14 Save & next in a pass sends confirm_prices; a plain save outside a pass does not", async () => {
    expect(await sentBody(true)).toMatchObject({ confirm_prices: true });
    expect(await sentBody(false)).not.toHaveProperty("confirm_prices");
  });

  it("UP-14 only the Edit positions step asks to confirm prices", () => {
    expect(stepSaveOptions("edit-positions", true)).toEqual({ confirmPrices: true });
    expect(stepSaveOptions("edit-positions", false)).toEqual({ confirmPrices: false });
    expect(stepSaveOptions("update-value", true)).toEqual({ confirmPrices: false });
    expect(stepSaveOptions("update-balance", true)).toEqual({ confirmPrices: false });
  });

  it("UP-14 focus lands on Save & next for Edit positions in a pass, on the first input otherwise", () => {
    expect(stepFocus("edit-positions", true)).toBe("save");
    expect(stepFocus("edit-positions", false)).toBe("input");
    expect(stepFocus("update-value", true)).toBe("input");
    expect(stepFocus("update-balance", true)).toBe("input");
  });
});
