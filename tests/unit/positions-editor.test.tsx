import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const ed = await import("@/lib/views/positions-editor");
const { initialAdd, initialEdit, saveHolding, toRequest, validate } = await import("@/lib/views/holding-entry");
const { AssetForm } = await import("@/components/modal/AssetForm");
const { BUILTIN_MODES, resolveModal } = await import("@/lib/views/modal-modes");
const { holding, portfolio } = await import("../fixtures/portfolio");

type State = ReturnType<typeof ed.initialEditor>;
type Action = Parameters<typeof ed.positionsReducer>[1];
type Lookup = Extract<Action, { type: "lookupResolved" }>["result"];

const run = (state: State, ...actions: Action[]) => actions.reduce(ed.positionsReducer, state);
const type = (value: string): Action => ({ type: "type", value });
const field = (name: "shares" | "avgCost" | "price" | "sector" | "name", value: string): Action => ({ type: "field", name, value });
const resolve = (key: string, result: Lookup): Action => ({ type: "lookupResolved", key, result });

const apple: Lookup = { known: true, ticker: "AAPL", name: "Apple Inc.", sector: "Technology", exchange: "NASDAQ", price: { amount: 232.1, currency: "USD" } };
const infyUnknown: Lookup = { known: false, ticker: "INFY.NS", name: "Infosys Limited", exchange: "NSE" };
const tdf: Lookup = { known: false, ticker: "TDF2055", name: null, exchange: null };

const us = () => ed.initialEditor("US", []);
const india = () => ed.initialEditor("IN", []);
const addApple = (state: State, shares: string) => run(state, type("AAPL"), resolve("AAPL", apple), field("shares", shares), { type: "add" });

describe("lookup preview", () => {
  it.each([
    ["US", "", null, "Try AAPL, GOOGL, META, V, CAT, TSLA", false],
    ["IN", "", null, "Try RELIANCE, INFY, TCS, ITC, LT", false],
    ["US", "aapl", apple, "Apple Inc. · Technology · $232 · NASDAQ", false],
    ["US", "TDF2055", tdf, "No market price for TDF2055. Enter its price and Sector.", true],
    ["IN", "infy", infyUnknown, "Infosys Limited · no market price. Enter its price and Sector.", true],
  ] as const)("HE-13 %s %j previews", (country, typed, lookup, preview, manual) => {
    let state = ed.initialEditor(country, []);
    if (typed) state = run(state, type(typed), resolve(ed.tickerKey(typed, country), lookup!));
    expect(ed.preview(state)).toBe(preview);
    expect(ed.showManual(state)).toBe(manual);
  });

  it("HE-13 a lookup for a ticker no longer typed is ignored", () => {
    const state = run(us(), type("aapl"), type("tsla"), resolve("AAPL", apple));
    expect(ed.preview(state)).toBe("Looking up TSLA…");
    expect(ed.showManual(state)).toBe(false);
  });
});

describe("ticker keys", () => {
  it.each([
    ["IN", "infy", "INFY.NS", "INFY"],
    ["IN", "INFY.BO", "INFY.BO", "INFY"],
    ["US", " aapl ", "AAPL", "AAPL"],
  ] as const)("HE-14 %s %s", (country, typed, stored, shown) => {
    expect(ed.tickerKey(typed, country)).toBe(stored);
    expect(ed.shortTicker(stored)).toBe(shown);
  });
});

describe("unknown tickers", () => {
  it("HE-15 name and Sector are pre-filled from the lookup", () => {
    const state = run(india(), type("INFY"), resolve("INFY.NS", infyUnknown));
    expect(state.entry).toMatchObject({ name: "Infosys Limited", sector: "Other" });
    const bare = run(us(), type("TDF2055"), resolve("TDF2055", tdf));
    expect(bare.entry).toMatchObject({ name: "", sector: "Other" });
  });
});

describe("adding", () => {
  it("HE-16 a blank ticker", () => {
    const state = run(us(), { type: "add" });
    expect(state.error).toBe("Enter a ticker");
    expect(state.positions).toEqual([]);
  });

  it("HE-16 zero shares", () => {
    const state = run(us(), type("AAPL"), resolve("AAPL", apple), field("shares", "0"), { type: "add" });
    expect(state.error).toBe("Enter number of shares");
    expect(state.positions).toEqual([]);
  });

  it("HE-16 an unknown ticker needs a price", () => {
    const state = run(us(), type("TDF2055"), resolve("TDF2055", tdf), field("shares", "100"), { type: "add" });
    expect(state.error).toBe("Enter a price for TDF2055");
    expect(state.positions).toEqual([]);
  });

  it("HE-16 add waits for a pending lookup, then adds", () => {
    let state = run(us(), type("AAPL"), field("shares", "30"), { type: "add" });
    expect(state.positions).toEqual([]);
    expect(state.error).toBeNull();
    state = run(state, resolve("AAPL", apple));
    expect(state.positions).toHaveLength(1);
  });

  it("HE-17 a blank avg cost defaults to the price", () => {
    const state = addApple(us(), "30");
    expect(ed.rowLine(state.positions[0])).toBe("30 sh · avg $232 · now $232 · Technology");
    expect(state.entry).toMatchObject({ ticker: "", shares: "", avgCost: "", price: "" });
  });

  it("HE-18 adding a listed ticker replaces its row", () => {
    const state = run(addApple(us(), "30"), type("AAPL"), resolve("AAPL", apple), field("shares", "45"), { type: "add" });
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].shares).toBe(45);
  });

  it("HE-19 re-typing a listed ticker pre-fills it, and a new price replaces the row", () => {
    const start = ed.initialEditor("IN", [
      { ticker: "INFY.NS", shares: 90, avgCost: 1450, price: 1880, priceSource: "hand", priceAsOf: "2026-06-01", name: "Infosys Limited", sector: "Technology", exchange: "NSE" },
    ]);
    let state = run(start, type("INFY"));
    expect(state.entry).toMatchObject({ shares: "90", avgCost: "1450", price: "1880", sector: "Technology", name: "Infosys Limited" });
    state = run(state, resolve("INFY.NS", infyUnknown));
    expect(state.entry).toMatchObject({ name: "Infosys Limited", sector: "Technology" });
    state = run(state, field("price", "1912"), { type: "add" });
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0]).toMatchObject({ price: 1912, hand: true, priceAsOf: null });
  });
});

describe("listed positions", () => {
  const two = () =>
    ed.initialEditor("US", [
      { ticker: "AAPL", shares: 30, avgCost: 165, price: 232.1, priceSource: "market", priceAsOf: null, name: "Apple Inc.", sector: "Technology", exchange: "NASDAQ" },
      { ticker: "JPM", shares: 15, avgCost: 170, price: 246, priceSource: "market", priceAsOf: null, name: "JPMorgan", sector: "Financials", exchange: "NYSE" },
    ]);

  it("HE-20 rows, removal and total", () => {
    let state = two();
    expect(ed.total(state)).toBe("$10,653");
    expect(ed.rowLine(state.positions[0])).toBe("30 sh · avg $165 · now $232 · Technology");
    expect(ed.rowValue(state.positions[0])).toBe("$6,963");
    state = run(state, { type: "remove", ticker: "JPM" });
    expect(ed.total(state)).toBe("$6,963");
  });

  it("HE-21 a stale Hand Price is flagged", () => {
    const state = ed.initialEditor("IN", [
      { ticker: "INFY.NS", shares: 90, avgCost: 1450, price: 1880, priceSource: "hand", priceAsOf: "2026-08-03", name: "Infosys", sector: "Technology", exchange: "NSE" },
    ]);
    expect(ed.rowLine(state.positions[0], "2026-10-14")).toMatch(/ · price 72 days old$/);
    expect(ed.rowLine(state.positions[0], "2026-08-10")).not.toContain("days old");
  });
});

describe("saving Stocks", () => {
  const fidelity = holding({
    id: "s1",
    name: "Fidelity Brokerage",
    positions: [
      { ticker: "AAPL", shares: 30, avgCost: 165, price: 232.1, priceSource: "market", priceAsOf: null, name: "Apple Inc.", sector: "Technology", exchange: "NASDAQ" },
      { ticker: "JPM", shares: 15, avgCost: 170, price: 246, priceSource: "market", priceAsOf: null, name: "JPM", sector: "Financials", exchange: "NYSE" },
    ],
  });

  it("HE-24 saving after removing JPM sends only AAPL and no confirm_prices", () => {
    const form = initialEdit(fidelity);
    expect(form.positionCount).toBe(2);
    const state = run(ed.initialEditor("US", fidelity.positions), { type: "remove", ticker: "JPM" });
    const next = { ...form, ...ed.formPatch(state) };
    const { method, url, body } = toRequest(next, "s1");
    expect(method).toBe("PATCH");
    expect(url).toBe("/api/holdings/s1");
    expect(body.positions).toEqual([{ ticker: "AAPL", shares: 30, avg_cost: 165 }]);
    expect(body).not.toHaveProperty("confirm_prices");
    expect(toRequest(next, "s1", { confirmPrices: true }).body).toMatchObject({ confirm_prices: true });
  });

  it("HE-25 a saved unknown ticker carries its Hand Price, Sector and name", () => {
    const state = run(
      india(),
      type("INFY"),
      resolve("INFY.NS", infyUnknown),
      field("shares", "90"),
      field("avgCost", "1450"),
      field("price", "1880"),
      field("sector", "Technology"),
      { type: "add" },
    );
    const form = { ...initialAdd("stocks"), country: "IN" as const, name: "Zerodha", ...ed.formPatch(state) };
    expect(toRequest(form).body).toEqual({
      asset_class: "stocks",
      country: "IN",
      name: "Zerodha",
      positions: [{ ticker: "INFY.NS", shares: 90, avg_cost: 1450, hand_price: 1880, sector: "Technology", name: "Infosys Limited" }],
    });
  });

  it("HE-25 a hand-priced row with no name leaves the name out", () => {
    const state = run(us(), type("TDF2055"), resolve("TDF2055", tdf), field("shares", "100"), field("price", "12"), { type: "add" });
    const form = { ...initialAdd("stocks"), name: "x", ...ed.formPatch(state) };
    expect((toRequest(form).body.positions as unknown[])[0]).toEqual({ ticker: "TDF2055", shares: 100, avg_cost: 12, hand_price: 12, sector: "Other" });
  });

  it("HE-08 a typed but unadded ticker blocks Save", async () => {
    const state = run(addApple(us(), "1"), type("MSFT"));
    const form = { ...initialAdd("stocks"), name: "Fidelity", ...ed.formPatch(state) };
    expect(form.pendingTicker).toBe("MSFT");
    expect(validate(form)).toBe("Add MSFT or clear it first");
    const fetchFn = vi.fn();
    expect(await saveHolding(fetchFn, form)).toEqual({ ok: false, error: "Add MSFT or clear it first" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("HE-24 the Edit positions modal renders the list and total", () => {
    const data = portfolio({ holdings: [fidelity] });
    const match = resolveModal(data, new URLSearchParams("modal=update&holding=s1"), BUILTIN_MODES)!;
    expect(match.mode).toBe("edit-positions");
    const html = renderToStaticMarkup(
      <AssetForm match={match} data={data} formId="f" setBusy={() => {}} setError={() => {}} onSaved={() => {}} />,
    );
    expect(html).toContain("AAPL");
    expect(html).toContain("JPM");
    expect(html).toContain("$10,653");
  });
});
