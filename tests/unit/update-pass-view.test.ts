import { describe, expect, it } from "vitest";
import { buildOverview } from "@/lib/views/overview";
import { parsePass, passStep, updateAllEntry } from "@/lib/views/update-pass";
import { BUILTIN_MODES, closeHref, resolveModal } from "@/lib/views/modal-modes";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const daysAgo = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const val = (date: string, value: number) => ({ date, value, source: "user" as const });

const cash = (id: string, name: string, age: number, value = 18_000) =>
  holding({ id, name, assetClass: "cash", currentValue: value, valuations: [val(daysAgo(age), value)] });
const loan = (id: string, name: string, age: number, balance = 212_400) =>
  liability({ id, name, currentBalance: balance, valuations: [val(daysAgo(age), balance)] });

/** A "save": today's Valuation added, same figure (what Save & next records). */
const saved = (data: ReturnType<typeof portfolio>, id: string) => ({
  ...data,
  holdings: data.holdings.map((h) =>
    h.id === id ? { ...h, valuations: [...h.valuations, val(TODAY, h.currentValue)] } : h,
  ),
  liabilities: data.liabilities.map((l) =>
    l.id === id ? { ...l, valuations: [...l.valuations, val(TODAY, l.currentBalance)] } : l,
  ),
});

const abc = () =>
  portfolio({ today: TODAY, holdings: [cash("a", "A cash", 90), cash("b", "B cash", 60), cash("c", "C cash", 40)] });
const H = (id: string) => ({ kind: "holding" as const, id });

describe("updateAllEntry", () => {
  it("UP-01 Update all starts a pass on the oldest Stale item", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({ id: "cash", name: "Cash", assetClass: "cash", currentValue: 500_000, valuations: [val(daysAgo(90), 500_000)] }),
        holding({ id: "re", name: "Flat", assetClass: "realestate", currentValue: 900_000, valuations: [val(daysAgo(31), 900_000)] }),
      ],
      liabilities: [loan("loan", "Loan", 45, 115_700)],
    });

    expect(updateAllEntry(data, TODAY)).toEqual({
      label: "Update all (3)",
      href: "/?modal=update&holding=cash&pass=1&from=1284300",
    });
    expect(buildOverview(data, { range: "All" }).needsUpdating!.updateAll).toEqual(updateAllEntry(data, TODAY));
  });

  it("UP-01 a Liability first opens the balance edit", () => {
    const data = portfolio({ today: TODAY, liabilities: [loan("loan", "Loan", 45, 1_000)] });
    expect(updateAllEntry(data, TODAY)!.href).toBe("/?modal=update&liability=loan&pass=1&from=-1000");
  });

  it("UP-01 a Liability step href opens the update-balance modal", () => {
    const data = portfolio({ today: TODAY, liabilities: [loan("loan", "Loan", 45, 1_000)] });
    const href = updateAllEntry(data, TODAY)!.href;
    const match = resolveModal(data, new URLSearchParams(href.split("?")[1]), BUILTIN_MODES);
    expect(match).toMatchObject({ mode: "update-balance", liability: { id: "loan" } });
  });

  it("UP-02 nothing Stale gives no entry", () => {
    const data = portfolio({ today: TODAY, holdings: [cash("a", "A", 3)] });
    expect(updateAllEntry(data, TODAY)).toBeNull();
    expect(buildOverview(data, { range: "All" }).needsUpdating).toBeNull();
  });
});

describe("passStep", () => {
  it("UP-03 the form matches the kind of item", () => {
    const stocks = holding({
      id: "s",
      name: "Zerodha",
      assetClass: "stocks",
      currentValue: 100,
      positions: [
        { ticker: "AAA", shares: 1, avgCost: 1, price: 100, priceSource: "hand", priceAsOf: daysAgo(47), name: "AAA", sector: "Tech", exchange: null },
      ],
    });
    const data = portfolio({
      today: TODAY,
      holdings: [cash("c", "Cash", 100), stocks],
      liabilities: [loan("l", "Loan", 80)],
    });
    const form = (current: Parameters<typeof passStep>[1]["current"]) =>
      passStep(data, { current, i: 1, from: 0 }, TODAY).form;

    expect(form(H("c"))).toBe("update-value");
    expect(form(H("s"))).toBe("edit-positions");
    expect(form({ kind: "liability", id: "l" })).toBe("update-balance");
  });

  it("UP-04 items run oldest first, then by name, with an i of N counter", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [cash("w", "Wells Fargo cash", 90), cash("p", "Pune apartment", 45)],
      liabilities: [loan("a", "Amex Gold card", 45)],
    });
    expect(passStep(data, { current: H("w"), i: 1, from: 0 }, TODAY)).toMatchObject({
      title: "Wells Fargo cash",
      counter: "1 of 3",
      nextHref: "/?modal=update&liability=a&pass=2&from=0",
    });
    expect(passStep(data, { current: { kind: "liability", id: "a" }, i: 2, from: 0 }, TODAY)).toMatchObject({
      counter: "2 of 3",
      nextHref: "/?modal=update&holding=p&pass=3&from=0",
    });
    expect(passStep(data, { current: H("p"), i: 3, from: 0 }, TODAY).counter).toBe("3 of 3");
  });

  it("UP-05 confirming an unchanged value clears Stale and moves on", () => {
    const data = abc();
    const step = passStep(data, { current: H("a"), i: 1, from: 5 }, TODAY);
    expect(step.nextHref).toBe("/?modal=update&holding=b&pass=2&from=5");

    const after = saved(data, "a");
    expect(updateAllEntry(after, TODAY)!.label).toBe("Update all (2)");
    expect(passStep(after, { current: H("b"), i: 2, from: 5 }, TODAY).counter).toBe("2 of 3");
  });

  it("UP-06 Save & next on the last item leads to the summary", () => {
    const data = saved(saved(abc(), "a"), "b");
    expect(passStep(data, { current: H("c"), i: 3, from: 5 }, TODAY).nextHref).toBe("/?modal=pass-summary&from=5");
  });

  it("UP-07 a rejected save leaves the data, so the same step comes back", () => {
    const data = abc();
    const args = { current: H("b"), i: 2, from: 5 };
    expect(passStep(data, args, TODAY)).toEqual(passStep(structuredClone(data), args, TODAY));
    expect(passStep(data, args, TODAY).counter).toBe("2 of 3");
  });

  it("UP-09 skipping leaves the item Stale and opens the next", () => {
    const data = abc();
    const step = passStep(data, { current: H("a"), i: 1, from: 5 }, TODAY);
    expect(step.skipHref).toBe("/?modal=update&holding=b&pass=2&from=5");
    expect(updateAllEntry(data, TODAY)!.label).toBe("Update all (3)");
  });

  it("UP-10 a skipped item isn't offered again in the pass", () => {
    // A skipped at step 1 (still Stale, behind the cursor), B saved at step 2.
    const afterB = saved(abc(), "b");
    const stepC = passStep(afterB, { current: H("c"), i: 3, from: 5 }, TODAY);
    expect(stepC.counter).toBe("3 of 3");
    expect(stepC.nextHref).toBe("/?modal=pass-summary&from=5");
    expect(stepC.skipHref).toBe("/?modal=pass-summary&from=5");
  });

  it("UP-11 leaving clears every modal and pass param", () => {
    expect(closeHref("/", "modal=update&holding=a&pass=2&from=5")).toBe("/");
    expect(closeHref("/", "range=3Y&modal=update&holding=a&pass=2&from=5")).toBe("/?range=3Y");
  });

  it("UP-11 starting again covers what is still Stale", () => {
    const data = saved(abc(), "a");
    expect(updateAllEntry(data, TODAY)).toMatchObject({
      label: "Update all (2)",
      href: "/?modal=update&holding=b&pass=1&from=54000",
    });
  });

  it("UP-12 an item updated elsewhere drops out", () => {
    expect(passStep(abc(), { current: H("a"), i: 1, from: 5 }, TODAY).counter).toBe("1 of 3");
    // C updated in another tab, then A saved: the next step reads 2 of 2.
    const after = saved(saved(abc(), "c"), "a");
    expect(passStep(after, { current: H("b"), i: 2, from: 5 }, TODAY).counter).toBe("2 of 2");
  });

  it("UP-13 a step whose item is no longer Stale", () => {
    const data = saved(abc(), "c");
    const step = passStep(data, { current: H("c"), i: 2, from: 5 }, TODAY);
    expect(step.counter).toBe("2 of 4");
    expect(step.nextHref).toBe("/?modal=update&holding=a&pass=3&from=5");
  });

  it("UP-04 the base keeps other params", () => {
    const step = passStep(abc(), { current: H("a"), i: 1, from: 5 }, TODAY, "/?range=3Y");
    expect(step.nextHref).toBe("/?range=3Y&modal=update&holding=b&pass=2&from=5");
  });
});

describe("parsePass", () => {
  it("UP-03 a positive integer pass and a whole-dollar from", () => {
    expect(parsePass(new URLSearchParams("pass=3&from=-120"))).toEqual({ i: 3, from: -120 });
    expect(parsePass(new URLSearchParams("pass=3&from=abc"))).toEqual({ i: 3, from: null });
  });

  it("UP-03 a missing or invalid pass opens no pass", () => {
    expect(parsePass(new URLSearchParams(""))).toBeNull();
    expect(parsePass(new URLSearchParams("pass=0"))).toBeNull();
    expect(parsePass(new URLSearchParams("pass=x"))).toBeNull();
    expect(parsePass(new URLSearchParams("pass=1.5"))).toBeNull();
  });
});
