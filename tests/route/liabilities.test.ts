import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/liabilities/[id]/route";
import { GET, POST } from "@/app/api/liabilities/route";
import { POST as POST_LIABILITY_CLASS } from "@/app/api/liability-classes/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const LIABILITIES_URL = "http://localhost:3000/api/liabilities";
const LIABILITY_CLASSES_URL = "http://localhost:3000/api/liability-classes";
const HOLDINGS_URL = "http://localhost:3000/api/holdings";

async function createLiability(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST(
    requestAs(user, LIABILITIES_URL, {
      method: "POST",
      ...jsonBody({
        name: "Mortgage on 123 Main St",
        liability_class_id: DEFAULT_LIABILITY_CLASS_ID.mortgage,
        currency: "USD",
        ...overrides,
      }),
    }),
  );
  return response;
}

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled — mirrors tests/route/holdings.test.ts.
describe("GET/POST /api/liabilities, PATCH/DELETE /api/liabilities/[id]", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([
      createTestUser("liability-a"),
      createTestUser("liability-b"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(LIABILITIES_URL));
    expect(response.status).toBe(401);
  });

  it("adds a Liability under a Liability Class with a name and currency", async () => {
    const response = await createLiability(userA);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({
      liability_class_id: DEFAULT_LIABILITY_CLASS_ID.mortgage,
      name: "Mortgage on 123 Main St",
      currency: "USD",
    });
  });

  it("accepts any ISO currency code, not a hardcoded list", async () => {
    const response = await createLiability(userA, { name: "Tokyo apartment loan", currency: "JPY" });
    expect(response.status).toBe(201);
    expect((await response.json()).currency).toBe("JPY");
  });

  it("rejects a currency code that isn't valid ISO 4217", async () => {
    const response = await createLiability(userA, { currency: "NOTACODE" });
    expect(response.status).toBe(400);
  });

  it("rejects a liability_class_id that doesn't exist or isn't visible to the caller", async () => {
    const response = await createLiability(userA, {
      liability_class_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(response.status).toBe(400);
  });

  it("rejects creating a Liability under another User's custom Liability Class", async () => {
    const customClass = await POST_LIABILITY_CLASS(
      requestAs(userB, LIABILITY_CLASSES_URL, {
        method: "POST",
        ...jsonBody({ name: "B's Private Class" }),
      }),
    );
    const { id: privateClassId } = await customClass.json();

    const response = await createLiability(userA, { liability_class_id: privateClassId });
    expect(response.status).toBe(400);
  });

  it("edits a Liability's name, class, and currency", async () => {
    const created = await createLiability(userA);
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${LIABILITIES_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({
          name: "Refinanced mortgage",
          liability_class_id: DEFAULT_LIABILITY_CLASS_ID.autoLoan,
          currency: "EUR",
        }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated).toMatchObject({
      id,
      name: "Refinanced mortgage",
      liability_class_id: DEFAULT_LIABILITY_CLASS_ID.autoLoan,
      currency: "EUR",
    });
  });

  it("deletes a Liability", async () => {
    const created = await createLiability(userA);
    const { id } = await created.json();

    const response = await DELETE(requestAs(userA, `${LIABILITIES_URL}/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);

    const after = await GET(requestAs(userA, LIABILITIES_URL));
    const ids = (await after.json()).map((l: { id: string }) => l.id);
    expect(ids).not.toContain(id);
  });

  it("User A cannot read User B's Liabilities", async () => {
    const created = await createLiability(userB, { name: "B's liability" });
    const { id } = await created.json();

    const asA = await GET(requestAs(userA, LIABILITIES_URL));
    const idsVisibleToA = (await asA.json()).map((l: { id: string }) => l.id);
    expect(idsVisibleToA).not.toContain(id);
  });

  it("User A cannot update User B's Liability", async () => {
    const created = await createLiability(userB, { name: "B's liability to protect" });
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${LIABILITIES_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ name: "Hijacked" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const stillB = await GET(requestAs(userB, LIABILITIES_URL));
    const liability = (await stillB.json()).find((l: { id: string }) => l.id === id);
    expect(liability.name).toBe("B's liability to protect");
  });

  it("User A cannot delete User B's Liability", async () => {
    const created = await createLiability(userB, { name: "B's liability to keep" });
    const { id } = await created.json();

    const response = await DELETE(requestAs(userA, `${LIABILITIES_URL}/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);

    const stillB = await GET(requestAs(userB, LIABILITIES_URL));
    const ids = (await stillB.json()).map((l: { id: string }) => l.id);
    expect(ids).toContain(id);
  });

  // Ticket 11: Amortization Assumptions and payoff.
  describe("PATCH Amortization Assumptions", () => {
    async function patchLiability(user: TestUser, id: string, body: Record<string, unknown>) {
      return PATCH(
        requestAs(user, `${LIABILITIES_URL}/${id}`, { method: "PATCH", ...jsonBody(body) }),
        { params: Promise.resolve({ id }) },
      );
    }

    it("sets a full set of Amortization Assumptions on a Liability", async () => {
      const created = await createLiability(userA, { name: "Mortgage to amortize" });
      const { id } = await created.json();

      const response = await patchLiability(userA, id, {
        interest_rate: 0.06,
        original_loan_amount: 300_000,
        term_months: 360,
        custom_monthly_payment: 1_800,
        extra_monthly_payment: 200,
        escrow_portion: 650,
        start_date: "2024-05-01",
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        interest_rate: 0.06,
        original_loan_amount: 300_000,
        term_months: 360,
        custom_monthly_payment: 1_800,
        extra_monthly_payment: 200,
        escrow_portion: 650,
        start_date: "2024-05-01",
      });
    });

    it("any Liability can carry Amortization Assumptions, not only a Mortgage Class one", async () => {
      const created = await createLiability(userA, {
        name: "Car loan",
        liability_class_id: DEFAULT_LIABILITY_CLASS_ID.autoLoan,
      });
      const { id } = await created.json();

      const response = await patchLiability(userA, id, {
        interest_rate: 0.07,
        original_loan_amount: 20_000,
        term_months: 60,
      });
      expect(response.status).toBe(200);
      expect((await response.json()).interest_rate).toBe(0.07);
    });

    it("clears a field back to null with an explicit null", async () => {
      const created = await createLiability(userA, { name: "Loan to clear" });
      const { id } = await created.json();
      await patchLiability(userA, id, { interest_rate: 0.05, custom_monthly_payment: 500 });

      const response = await patchLiability(userA, id, { custom_monthly_payment: null });
      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.custom_monthly_payment).toBeNull();
      expect(updated.interest_rate).toBe(0.05); // untouched keys are left as-is
    });

    it("rejects a negative interest_rate", async () => {
      const created = await createLiability(userA, { name: "Bad rate" });
      const { id } = await created.json();
      const response = await patchLiability(userA, id, { interest_rate: -0.01 });
      expect(response.status).toBe(400);
    });

    it("rejects a non-positive term_months", async () => {
      const created = await createLiability(userA, { name: "Bad term" });
      const { id } = await created.json();
      const response = await patchLiability(userA, id, { term_months: 0 });
      expect(response.status).toBe(400);
    });

    it("rejects a malformed start_date", async () => {
      const created = await createLiability(userA, { name: "Bad date" });
      const { id } = await created.json();
      const response = await patchLiability(userA, id, { start_date: "05/01/2024" });
      expect(response.status).toBe(400);
    });

    it("rejects a negative extra_monthly_payment or escrow_portion", async () => {
      const created = await createLiability(userA, { name: "Bad extras" });
      const { id } = await created.json();
      expect((await patchLiability(userA, id, { extra_monthly_payment: -1 })).status).toBe(400);
      expect((await patchLiability(userA, id, { escrow_portion: -1 })).status).toBe(400);
    });

    it("User A cannot set Amortization Assumptions on User B's Liability", async () => {
      const created = await createLiability(userB, { name: "B's loan" });
      const { id } = await created.json();
      const response = await patchLiability(userA, id, { interest_rate: 0.05 });
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH linked_holding_id", () => {
    async function createHolding(user: TestUser) {
      const response = await POST_HOLDING(
        requestAs(user, HOLDINGS_URL, {
          method: "POST",
          ...jsonBody({ name: "The house it financed", asset_class_id: DEFAULT_ASSET_CLASS_ID.realEstate, currency: "USD" }),
        }),
      );
      return (await response.json()).id as string;
    }

    it("links a Liability to a Holding the same User owns", async () => {
      const holdingId = await createHolding(userA);
      const created = await createLiability(userA, { name: "Mortgage on the house" });
      const { id } = await created.json();

      const response = await PATCH(
        requestAs(userA, `${LIABILITIES_URL}/${id}`, {
          method: "PATCH",
          ...jsonBody({ linked_holding_id: holdingId }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(200);
      expect((await response.json()).linked_holding_id).toBe(holdingId);
    });

    it("rejects linking to a Holding the caller doesn't own", async () => {
      const holdingId = await createHolding(userB);
      const created = await createLiability(userA, { name: "Mortgage attempt" });
      const { id } = await created.json();

      const response = await PATCH(
        requestAs(userA, `${LIABILITIES_URL}/${id}`, {
          method: "PATCH",
          ...jsonBody({ linked_holding_id: holdingId }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(400);
    });

    it("rejects a linked_holding_id that doesn't exist", async () => {
      const created = await createLiability(userA, { name: "Mortgage attempt 2" });
      const { id } = await created.json();

      const response = await PATCH(
        requestAs(userA, `${LIABILITIES_URL}/${id}`, {
          method: "PATCH",
          ...jsonBody({ linked_holding_id: "00000000-0000-0000-0000-000000000000" }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(400);
    });

    it("unlinks with an explicit null", async () => {
      const holdingId = await createHolding(userA);
      const created = await createLiability(userA, { name: "Mortgage to unlink" });
      const { id } = await created.json();
      await PATCH(
        requestAs(userA, `${LIABILITIES_URL}/${id}`, {
          method: "PATCH",
          ...jsonBody({ linked_holding_id: holdingId }),
        }),
        { params: Promise.resolve({ id }) },
      );

      const response = await PATCH(
        requestAs(userA, `${LIABILITIES_URL}/${id}`, {
          method: "PATCH",
          ...jsonBody({ linked_holding_id: null }),
        }),
        { params: Promise.resolve({ id }) },
      );
      expect(response.status).toBe(200);
      expect((await response.json()).linked_holding_id).toBeNull();
    });
  });
});
