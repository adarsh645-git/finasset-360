import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/liabilities/l1",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));
import { renderToStaticMarkup } from "react-dom/server";
import { LoanDetail } from "@/components/liabilities/LoanDetail";
import { archiveThenLeave, deleteLabel, nextDeleteStep, type FetchFn } from "@/lib/views/holding-writes";
import { buildLiabilities } from "@/lib/views/liabilities";
import { buildLoanDetail } from "@/lib/views/loan-detail";
import { saveBalance, updateBalanceView } from "@/lib/views/loan-writes";
import { resolveModal } from "@/lib/views/modal-modes";
import { liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const fx = { today: { rate: 83.4, asOf: TODAY }, history: [{ date: "2025-01-31", rate: 83.4 }] };
const stale = liability({
  id: "l1",
  country: "IN",
  currency: "INR",
  name: "Apartment loan · HDFC",
  principal: 3_800_000,
  currentBalance: 3_430_000,
  apr: 8.5,
  monthlyPayment: 33_000,
  startMonth: "2022-04",
  valuations: [val("2026-09-04", 3_430_000)],
});
const mockFetch = (response: () => Response = () => new Response("{}", { status: 200 })) => {
  const fn = vi.fn(async (...args: [string, RequestInit]) => (void args, response()));
  return { fn, fetchFn: fn as unknown as FetchFn };
};
const bodyOf = (fn: ReturnType<typeof mockFetch>["fn"], call = 0) => JSON.parse(fn.mock.calls[call]![1].body as string);

describe("update balance", () => {
  it("LE-08 the modal reads the loan's name and the Was line", () => {
    const data = portfolio({ today: TODAY, fx, liabilities: [stale] });
    const match = resolveModal(data, new URLSearchParams("modal=update&liability=l1"));
    expect(match).toMatchObject({ mode: "update-balance", title: "Update balance", saveLabel: "Save" });
    expect(match!.liability!.id).toBe("l1");
    const view = updateBalanceView(stale, TODAY);
    expect(view.label).toBe("Current balance of Apartment loan · HDFC");
    expect(view.initial).toBe("3430000");
    expect(view.was).toBe("Was ₹34,30,000 · logged as today’s value, Oct 14, 2026");
  });

  it("LE-08 an unknown or archived loan opens nothing", () => {
    const data = portfolio({
      today: TODAY,
      liabilities: [stale, liability({ id: "old", archivedAt: "2026-01-01T00:00:00Z" })],
    });
    for (const qs of ["modal=update&liability=old", "modal=update&liability=zz", "modal=update"]) {
      expect(resolveModal(data, new URLSearchParams(qs))).toBeNull();
    }
  });

  it("LE-08 saving posts today's balance, even unchanged, and the detail loses its stale cue", async () => {
    const { fn, fetchFn } = mockFetch();
    expect((await saveBalance(fetchFn, "l1", "34,02,000")).ok).toBe(true);
    expect(fn.mock.calls[0]![0]).toBe("/api/liabilities/l1/valuations");
    expect(bodyOf(fn)).toEqual({ balance: 3_402_000 });
    await saveBalance(fetchFn, "l1", "3430000");
    expect(bodyOf(fn, 1)).toEqual({ balance: 3_430_000 });

    const before = buildLoanDetail(portfolio({ today: TODAY, fx, liabilities: [stale] }), { loanId: "l1" })!;
    expect(before.nativeLine).toContain("updated 40 days ago");
    const after = buildLoanDetail(
      portfolio({
        today: TODAY,
        fx,
        liabilities: [{ ...stale, currentBalance: 3_402_000, valuations: [...stale.valuations, val(TODAY, 3_402_000)] }],
      }),
      { loanId: "l1" },
    )!;
    expect(after.nativeLine).toBe("₹34,02,000 at ₹83.40/$");
  });

  it.each(["", "  ", "-5", "abc"])("LE-08 %j shows Enter the current balance and posts nothing", async (raw) => {
    const { fn, fetchFn } = mockFetch();
    expect(await saveBalance(fetchFn, "l1", raw)).toEqual({ ok: false, error: "Enter the current balance" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("LE-08 a route error comes back as the footer sentence", async () => {
    const { fetchFn } = mockFetch(() => new Response(JSON.stringify({ error: "Nope." }), { status: 400 }));
    expect(await saveBalance(fetchFn, "l1", "5")).toEqual({ ok: false, error: "Nope." });
  });
});

describe("delete a loan", () => {
  const detail = buildLoanDetail(portfolio({ today: TODAY, fx, liabilities: [stale] }), { loanId: "l1" })!;

  it("LD-10 the first click asks, the second archives and goes to /liabilities", async () => {
    expect(deleteLabel("idle")).toBe("Delete");
    expect(deleteLabel(nextDeleteStep("idle"))).toBe("Confirm delete");
    const { fn, fetchFn } = mockFetch();
    const push = vi.fn();
    const failure = await archiveThenLeave({
      fetchFn,
      url: `/api/liabilities/${detail.id}/archive`,
      to: detail.afterArchive,
      push,
      refresh: vi.fn(),
    });
    expect(failure).toBeNull();
    expect(fn.mock.calls[0]![0]).toBe("/api/liabilities/l1/archive");
    expect(push).toHaveBeenCalledWith("/liabilities");
  });

  it("LD-10 Loan detail renders Update balance and a Delete button", () => {
    const html = renderToStaticMarkup(<LoanDetail detail={detail} />);
    expect(html).toContain('href="/liabilities/l1?modal=update&amp;liability=l1"');
    expect(html).toContain(">Update balance<");
    expect(html).toContain(">Delete<");
  });

  it("LD-10 once archived, the loan has no row and no detail", () => {
    const archived = { ...stale, archivedAt: "2026-10-14T00:00:00Z" };
    const data = portfolio({ today: TODAY, fx, liabilities: [archived] });
    expect(buildLiabilities(data).rows).toHaveLength(0);
    expect(buildLoanDetail(data, { loanId: "l1" })).toBeNull();
  });
});
