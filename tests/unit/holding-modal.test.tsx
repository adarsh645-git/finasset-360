import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/holdings/h1",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));
import { renderToStaticMarkup } from "react-dom/server";
import {
  BUILTIN_MODES,
  closeHref,
  resolveModal,
  type ModeRow,
} from "@/lib/views/modal-modes";
import {
  archiveThenLeave,
  deleteLabel,
  type FetchFn,
  nextDeleteStep,
  saveValue,
  updateValueView,
} from "@/lib/views/holding-writes";
import { ModalFrame } from "@/components/modal/ModalFrame";
import { ConfirmDeleteButton } from "@/components/holding/ConfirmDeleteButton";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const cash = holding({ id: "cash1", assetClass: "cash", name: "Checking", currentValue: 6200 });
const metals = holding({ id: "gold1", assetClass: "metals", name: "Gold", currentValue: 900 });
const stocks = holding({ id: "stk1", assetClass: "stocks", name: "Fidelity Brokerage" });
const archived = holding({ id: "old1", assetClass: "cash", archivedAt: "2026-01-01T00:00:00Z" });
const data = portfolio({ today: TODAY, holdings: [cash, metals, stocks, archived] });
const open = (qs: string, modes?: ModeRow[]) => resolveModal(data, new URLSearchParams(qs), modes);
const bodyOf = (call: unknown) => JSON.parse((call as [string, RequestInit])[1].body as string);

describe("modal mode table", () => {
  it.each([
    ["modal=add-asset", "Add to portfolio", "Add account"],
    ["modal=add-asset&class=realestate", "Add to portfolio", "Add property"],
    ["modal=add-asset&class=metals", "Add to portfolio", "Add asset"],
    ["modal=edit&holding=cash1", "Edit account", "Save"],
    ["modal=edit&holding=gold1", "Edit asset", "Save"],
    ["modal=update&holding=cash1", "Update value", "Save"],
    ["modal=update&holding=stk1", "Edit positions", "Save"],
  ])("HE-01 %s opens %s with %s", (qs, title, saveLabel) => {
    expect(open(qs)).toMatchObject({ title, saveLabel });
  });

  it.each([
    "modal=edit&holding=old1",
    "modal=update&holding=someone-elses",
    "modal=add-liability",
    "modal=nonsense",
    "holding=cash1",
    "",
  ])("HE-02 %s opens nothing", (qs) => {
    expect(open(qs)).toBeNull();
  });

  it("HE-02 an unknown class opens the add modal with Stocks selected", () => {
    expect(open("modal=add-asset&class=boats")).toMatchObject({
      mode: "add-asset",
      classId: "stocks",
      saveLabel: "Add account",
    });
  });

  it("HE-03 closing removes only the modal params", () => {
    expect(closeHref("/holdings/h1", "position=h1%7EAAPL&modal=edit&holding=h1&class=cash")).toBe(
      "/holdings/h1?position=h1~AAPL",
    );
    expect(closeHref("/holdings/h1", "modal=update&holding=h1")).toBe("/holdings/h1");
  });

  it("HE-03 pass and from survive a close", () => {
    expect(closeHref("/update", "pass=1&from=%2Fgoals&modal=update&holding=h1")).toBe(
      "/update?pass=1&from=%2Fgoals",
    );
  });

  it("HE-03 externally registered rows resolve through the table", () => {
    const passSummary: ModeRow = {
      id: "pass-summary",
      match: (params) =>
        params.get("modal") === "pass-summary"
          ? { mode: "pass-summary", title: "Update pass", saveLabel: "Done", holding: null }
          : null,
    };
    expect(open("modal=pass-summary")).toBeNull();
    expect(open("modal=pass-summary&pass=1", [...BUILTIN_MODES, passSummary])).toMatchObject({
      title: "Update pass",
    });
    expect(open("modal=update&holding=cash1", [...BUILTIN_MODES, passSummary])).toMatchObject({
      title: "Update value",
    });
  });
});

describe("Update value", () => {
  it("HE-22 pre-fills the current value and says what will be logged", () => {
    const pune = holding({
      id: "p1",
      assetClass: "realestate",
      country: "IN",
      currency: "INR",
      currentValue: 6_200_000,
    });
    expect(updateValueView(pune, TODAY)).toEqual({
      prefix: "₹",
      initial: "6200000",
      was: "Was ₹62,00,000 · logged as today's value, Oct 14, 2026",
    });
    expect(updateValueView(cash, TODAY).prefix).toBe("$");
  });

  it("HE-23 saving an unchanged value still posts today's Valuation", async () => {
    const fetchFn = vi.fn<FetchFn>(async () => Response.json({ id: "cash1" }));
    const view = updateValueView(cash, TODAY);
    const result = await saveValue(fetchFn, "cash1", view.initial);
    expect(result).toEqual({ ok: true, result: { id: "cash1" } });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe("/api/holdings/cash1/valuations");
    expect(fetchFn.mock.calls[0][1].method).toBe("POST");
    expect(bodyOf(fetchFn.mock.calls[0])).toEqual({ value: 6200 });
  });

  it("HE-23 strips currency marks, and a blank value is refused before any request", async () => {
    const fetchFn = vi.fn<FetchFn>(async () => Response.json({ id: "cash1" }));
    await saveValue(fetchFn, "cash1", "$6,250 ");
    expect(bodyOf(fetchFn.mock.calls[0])).toEqual({ value: 6250 });
    fetchFn.mockClear();
    expect(await saveValue(fetchFn, "cash1", "  ")).toEqual({ ok: false, error: "Enter the current value" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("HE-23 the plain form never sends confirm_prices; a caller can opt in", async () => {
    const fetchFn = vi.fn<FetchFn>(async () => Response.json({ id: "cash1" }));
    await saveValue(fetchFn, "cash1", "5");
    await saveValue(fetchFn, "cash1", "5", { confirmPrices: true });
    expect(bodyOf(fetchFn.mock.calls[0])).not.toHaveProperty("confirm_prices");
    expect(bodyOf(fetchFn.mock.calls[1])).toMatchObject({ confirm_prices: true });
  });

  it("HE-23 a rejected save returns the route's sentence", async () => {
    const fetchFn = async () =>
      Response.json({ error: "Value must be a number of 0 or more." }, { status: 400 });
    expect(await saveValue(fetchFn, "cash1", "5")).toEqual({
      ok: false,
      error: "Value must be a number of 0 or more.",
    });
  });
});

describe("modal frame", () => {
  it("HE-01 renders title, close, error line, Cancel, Save and the slots", () => {
    const html = renderToStaticMarkup(
      <ModalFrame
        title="Update value"
        saveLabel="Save"
        error="Enter the current value"
        saving={false}
        formId="f"
        onClose={() => {}}
        headerSlot={<i data-slot="header" />}
        footerSlot={<i data-slot="footer" />}
      >
        <p>body</p>
      </ModalFrame>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Update value");
    expect(html).toContain('aria-label="Close"');
    expect(html).toContain("Enter the current value");
    expect(html).toContain("Cancel");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*form="f"[^>]*>Save</);
    expect(html).toContain('data-slot="header"');
    expect(html).toContain('data-slot="footer"');
  });

  it("HE-01 Save is disabled while saving", () => {
    const html = renderToStaticMarkup(
      <ModalFrame title="t" saveLabel="Save" error={null} saving formId="f" onClose={() => {}}>
        x
      </ModalFrame>,
    );
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""|<button[^>]*disabled=""[^>]*type="submit"/);
  });
});

describe("Delete", () => {
  it("HD-07 the first click asks to confirm and archives nothing", () => {
    expect(deleteLabel("idle")).toBe("Delete");
    expect(nextDeleteStep("idle")).toBe("confirm");
    expect(deleteLabel("confirm")).toBe("Confirm delete");
  });

  it("HD-07 the button starts as Delete", () => {
    expect(renderToStaticMarkup(<ConfirmDeleteButton url="/api/holdings/h1/archive" to="/" />)).toMatch(
      /<button[^>]*>Delete<\/button>/,
    );
  });

  it("HD-07 the second click archives, goes to the Overview and refreshes", async () => {
    expect(nextDeleteStep("confirm")).toBe("archive");
    const calls: string[] = [];
    const fetchFn = vi.fn(async (...args: [string, RequestInit]) => {
      calls.push(`fetch ${args[0]}`);
      return Response.json({ id: "h1" });
    });
    const error = await archiveThenLeave({
      fetchFn,
      url: "/api/holdings/h1/archive",
      to: "/",
      push: (to) => calls.push(`push ${to}`),
      refresh: () => calls.push("refresh"),
    });
    expect(error).toBeNull();
    expect(calls).toEqual(["fetch /api/holdings/h1/archive", "push /", "refresh"]);
    expect(fetchFn.mock.calls[0][1].method).toBe("POST");
  });

  it("HD-07 a failed archive stays on the page with the route's sentence", async () => {
    const push = vi.fn();
    const error = await archiveThenLeave({
      fetchFn: async () => Response.json({ error: "Not found." }, { status: 404 }),
      url: "/api/holdings/h1/archive",
      to: "/",
      push,
      refresh: vi.fn(),
    });
    expect(error).toBe("Not found.");
    expect(push).not.toHaveBeenCalled();
  });
});
