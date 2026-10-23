import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const {
  CLASS_ORDER,
  defaultAfterSave,
  formFor,
  initialAdd,
  initialEdit,
  prefixFor,
  saveHolding,
  switchClass,
  toRequest,
  validate,
} = await import("@/lib/views/holding-entry");
const { AssetForm } = await import("@/components/modal/AssetForm");
const { holding, portfolio } = await import("../fixtures/portfolio");

type Form = ReturnType<typeof initialAdd>;
const filled = (over: Partial<Form>): Form => ({ ...initialAdd("cash"), ...over });
const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

describe("asset form fields", () => {
  it.each([
    ["stocks", "Account name", "e.g. Schwab brokerage", ["Positions"]],
    ["realestate", "Property name", "e.g. Austin condo", ["Property type", "City / location", "Current value", "Cost basis (optional)"]],
    ["cash", "Name", "e.g. Chase savings", ["Current value", "Cost basis (optional)"]],
    ["crypto", "Name", "e.g. Coinbase", ["Current value", "Cost basis (optional)"]],
    ["metals", "Name", "e.g. Gold coins", ["Current value", "Cost basis (optional)", "Quantity", "Unit"]],
    ["other", "Name", "e.g. 2022 Honda CR-V", ["Current value", "Cost basis (optional)"]],
  ] as const)("HE-04 %s has its label, placeholder and fields", (classId, label, placeholder, fields) => {
    expect(formFor(classId)).toEqual({ nameLabel: label, placeholder, fields });
  });

  it("HE-04 the add form renders the chips in order and the class's fields", () => {
    const html = renderToStaticMarkup(
      <AssetForm
        match={{ mode: "add-asset", title: "Add to portfolio", saveLabel: "Add asset", holding: null, classId: "metals" }}
        data={portfolio()}
        formId="f"
        setBusy={() => {}}
        setError={() => {}}
        onSaved={() => {}}
      />,
    );
    const labels = ["Stocks", "Real estate", "Cash", "Crypto", "Metals", "Vehicles &amp; other"];
    const at = labels.map((l) => html.indexOf(`>${l}</button>`));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain("e.g. Gold coins");
    expect(html).toContain("Quantity");
    expect(html).toContain("Held in");
    expect(CLASS_ORDER).toEqual(["stocks", "realestate", "cash", "crypto", "metals", "other"]);
  });

  it("HE-05 the new form defaults", () => {
    const form = initialAdd("stocks");
    expect(form).toMatchObject({ classId: "stocks", country: "US" });
    expect(prefixFor(form.country)).toBe("$");
    expect(switchClass(form, "realestate").propertyType).toBe("Residential");
    expect(switchClass(form, "metals").unit).toBe("g");
    expect(prefixFor("IN")).toBe("₹");
  });

  it("HE-06 switching class keeps the name, description and Held in", () => {
    const typed = { ...initialAdd("cash"), name: "Chase savings", description: "Everyday account", country: "IN" as const };
    const back = switchClass(switchClass(typed, "crypto"), "cash");
    expect(back).toMatchObject({ name: "Chase savings", description: "Everyday account", country: "IN", classId: "cash" });
  });
});

describe("edit form", () => {
  const pune = holding({
    id: "re1",
    assetClass: "realestate",
    country: "IN",
    currency: "INR",
    name: "Pune apartment",
    description: "2BHK · rented",
    propertyType: "Land",
    city: "Pune",
    currentValue: 6200000,
    costBasis: 4800000,
  });

  it("HE-07 a Real estate Holding's edit form is pre-filled with no class chips or Held in", () => {
    const html = renderToStaticMarkup(
      <AssetForm
        match={{ mode: "edit", title: "Edit property", saveLabel: "Save", holding: pune }}
        data={portfolio({ holdings: [pune] })}
        formId="f"
        setBusy={() => {}}
        setError={() => {}}
        onSaved={() => {}}
      />,
    );
    for (const v of ["Pune apartment", "2BHK · rented", "Pune", "6200000", "4800000"]) {
      expect(html).toContain(`value="${v}"`);
    }
    expect(html).toMatch(/aria-pressed="true"[^>]*>Land</);
    expect(html).toContain("₹");
    expect(html).not.toContain("Held in");
    expect(html).not.toContain(">Stocks<");
    expect(html).not.toContain(">Cash<");
    expect(initialEdit(pune)).toMatchObject({ classId: "realestate", country: "IN", propertyType: "Land" });
  });
});

describe("validate and toRequest", () => {
  it.each([
    [filled({ name: "", value: "5,000" }), "Give it a name"],
    [filled({ name: "Chase savings", value: "" }), "Enter the current value"],
    [filled({ name: "Chase savings", value: "abc" }), "Enter the current value"],
    [{ ...initialAdd("stocks"), name: "Fidelity" }, "Add at least one position"],
    [{ ...initialAdd("stocks"), name: "Fidelity", positionCount: 1, pendingTicker: "MSFT" }, "Add MSFT or clear it first"],
  ])("HE-08 %# shows its message", (form, message) => {
    expect(validate(form)).toBe(message);
  });

  it("HE-08 a complete form has no message", () => {
    expect(validate(filled({ name: "Chase savings", value: "11,800" }))).toBeNull();
  });

  it.each([
    [filled({ name: "Chase", value: "100", costBasis: "-5" }), "Cost basis must be 0 or more"],
    [filled({ name: "Chase", value: "100", costBasis: "abc" }), "Cost basis must be 0 or more"],
    [{ ...initialAdd("metals"), name: "Gold", value: "100", quantity: "-2" }, "Quantity must be 0 or more"],
    [{ ...initialAdd("metals"), name: "Gold", value: "100", quantity: "lots" }, "Quantity must be 0 or more"],
  ])("HE-08 a typed optional amount that is not 0 or more is a footer error %#", (form, message) => {
    expect(validate(form)).toBe(message);
  });

  it("HE-08 blank optional amounts are fine, and the value check comes first", () => {
    expect(validate(filled({ name: "Chase", value: "100", costBasis: "  " }))).toBeNull();
    expect(validate(filled({ name: "Chase", value: "", costBasis: "-5" }))).toBe("Enter the current value");
  });

  it("HE-12 a bad Cost basis on an edit sends nothing instead of clearing the saved one", async () => {
    const fetchFn = vi.fn(reply(200, { id: "h1" }));
    const saved = await saveHolding(fetchFn, filled({ name: "Chase", value: "100", costBasis: "-5" }), "h1");
    expect(saved).toEqual({ ok: false, error: "Cost basis must be 0 or more" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("HE-09 amounts accept currency signs, commas and spaces", () => {
    const form = filled({ country: "IN", name: "SBI NRE", value: "₹6,40,000", costBasis: " 5,00,000 " });
    expect(toRequest(form).body).toMatchObject({ value: 640000, cost_basis: 500000 });
  });

  it("HE-10 blank optional fields are left out", () => {
    const form = { ...initialAdd("metals"), name: "Silver Eagles", value: "640" };
    const { method, url, body } = toRequest(form);
    expect(method).toBe("POST");
    expect(url).toBe("/api/holdings");
    expect(body).toEqual({ asset_class: "metals", country: "US", name: "Silver Eagles", value: 640 });
  });

  it("HE-10 an edit goes to PATCH with the class and Country unchanged", () => {
    const form = { ...initialAdd("realestate"), name: "Condo", value: "1", city: " Austin " };
    const edit = toRequest(form, "re1");
    expect(edit).toMatchObject({ method: "PATCH", url: "/api/holdings/re1" });
    expect(edit.body).toMatchObject({ asset_class: "realestate", country: "US", property_type: "Residential", city: "Austin" });
  });

  it("HE-10 metals send the unit only with a quantity", () => {
    const form = { ...initialAdd("metals"), name: "Gold", value: "1", quantity: "2.5", unit: "oz t" as const };
    expect(toRequest(form).body).toMatchObject({ quantity: 2.5, unit: "oz t" });
  });
});

describe("saving", () => {
  const form = filled({ name: "Chase savings", value: "11,800" });

  it("HE-11 an add goes to the new Holding", async () => {
    const saved = await saveHolding(reply(201, { id: "h9" }), form);
    expect(saved).toEqual({ ok: true, result: { id: "h9" } });
    expect(defaultAfterSave("add-asset", { id: "h9" })).toBe("/holdings/h9");
    expect(defaultAfterSave("edit", { id: "h9" })).toBeNull();
  });

  it("HE-12 a rejected save returns the route's sentence and a failed check sends nothing", async () => {
    const rejected = await saveHolding(reply(400, { error: "Cost basis must be 0 or more" }), form, "h1");
    expect(rejected).toEqual({ ok: false, error: "Cost basis must be 0 or more" });
    const fetchFn = vi.fn(reply(201, { id: "x" }));
    expect(await saveHolding(fetchFn, filled({ name: "" }))).toEqual({ ok: false, error: "Give it a name" });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
