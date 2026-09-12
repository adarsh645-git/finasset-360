import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/liabilities/[id]/route";
import { GET, POST } from "@/app/api/liabilities/route";
import { POST as POST_LIABILITY_CLASS } from "@/app/api/liability-classes/route";
import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const LIABILITIES_URL = "http://localhost:3000/api/liabilities";
const LIABILITY_CLASSES_URL = "http://localhost:3000/api/liability-classes";

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
});
