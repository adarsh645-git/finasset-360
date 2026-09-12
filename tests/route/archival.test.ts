import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DELETE as DELETE_ASSET_CLASS } from "@/app/api/asset-classes/[id]/route";
import { POST as POST_ASSET_CLASS } from "@/app/api/asset-classes/route";
import { POST as ARCHIVE_HOLDING } from "@/app/api/holdings/[id]/archive/route";
import { GET as GET_HOLDINGS, POST as POST_HOLDING } from "@/app/api/holdings/route";
import { DELETE as DELETE_LIABILITY_CLASS } from "@/app/api/liability-classes/[id]/route";
import { POST as POST_LIABILITY_CLASS } from "@/app/api/liability-classes/route";
import { POST as ARCHIVE_LIABILITY } from "@/app/api/liabilities/[id]/archive/route";
import { GET as GET_LIABILITIES, POST as POST_LIABILITY } from "@/app/api/liabilities/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const HOLDINGS_URL = "http://localhost:3000/api/holdings";
const LIABILITIES_URL = "http://localhost:3000/api/liabilities";
const ASSET_CLASSES_URL = "http://localhost:3000/api/asset-classes";
const LIABILITY_CLASSES_URL = "http://localhost:3000/api/liability-classes";

async function createHolding(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST_HOLDING(
    requestAs(user, HOLDINGS_URL, {
      method: "POST",
      ...jsonBody({
        name: "10 shares of AAPL",
        asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
        currency: "USD",
        ...overrides,
      }),
    }),
  );
  return response;
}

async function createLiability(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST_LIABILITY(
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
describe("POST /api/holdings/[id]/archive, POST /api/liabilities/[id]/archive", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("archive-a"), createTestUser("archive-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("archives a Holding: it disappears from GET /api/holdings but the row survives", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const archived = await ARCHIVE_HOLDING(
      requestAs(userA, `${HOLDINGS_URL}/${id}/archive`, { method: "POST" }),
      { params: Promise.resolve({ id }) },
    );
    expect(archived.status).toBe(200);
    expect((await archived.json()).archived_at).not.toBeNull();

    const after = await GET_HOLDINGS(requestAs(userA, HOLDINGS_URL));
    const ids = (await after.json()).map((h: { id: string }) => h.id);
    expect(ids).not.toContain(id);
  });

  it("archives a Liability the same way", async () => {
    const created = await createLiability(userA);
    const { id } = await created.json();

    const archived = await ARCHIVE_LIABILITY(
      requestAs(userA, `${LIABILITIES_URL}/${id}/archive`, { method: "POST" }),
      { params: Promise.resolve({ id }) },
    );
    expect(archived.status).toBe(200);
    expect((await archived.json()).archived_at).not.toBeNull();

    const after = await GET_LIABILITIES(requestAs(userA, LIABILITIES_URL));
    const ids = (await after.json()).map((l: { id: string }) => l.id);
    expect(ids).not.toContain(id);
  });

  it("User A cannot archive User B's Holding", async () => {
    const created = await createHolding(userB, { name: "B's holding" });
    const { id } = await created.json();

    const response = await ARCHIVE_HOLDING(
      requestAs(userA, `${HOLDINGS_URL}/${id}/archive`, { method: "POST" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const stillB = await GET_HOLDINGS(requestAs(userB, HOLDINGS_URL));
    const ids = (await stillB.json()).map((h: { id: string }) => h.id);
    expect(ids).toContain(id);
  });

  it("User A cannot archive User B's Liability", async () => {
    const created = await createLiability(userB, { name: "B's liability" });
    const { id } = await created.json();

    const response = await ARCHIVE_LIABILITY(
      requestAs(userA, `${LIABILITIES_URL}/${id}/archive`, { method: "POST" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const stillB = await GET_LIABILITIES(requestAs(userB, LIABILITIES_URL));
    const ids = (await stillB.json()).map((l: { id: string }) => l.id);
    expect(ids).toContain(id);
  });

  it("refuses to delete an Asset Class that still has an archived Holding — archived rows still need their class for historical grouping", async () => {
    const created = await POST_ASSET_CLASS(
      requestAs(userA, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Once Occupied" }) }),
    );
    const { id: assetClassId } = await created.json();

    const holding = await createHolding(userA, { asset_class_id: assetClassId });
    const { id: holdingId } = await holding.json();

    await ARCHIVE_HOLDING(requestAs(userA, `${HOLDINGS_URL}/${holdingId}/archive`, { method: "POST" }), {
      params: Promise.resolve({ id: holdingId }),
    });

    const deleteResponse = await DELETE_ASSET_CLASS(
      requestAs(userA, `${ASSET_CLASSES_URL}/${assetClassId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: assetClassId }) },
    );
    expect(deleteResponse.status).toBe(409);
  });

  it("refuses to delete a Liability Class that still has an archived Liability", async () => {
    const created = await POST_LIABILITY_CLASS(
      requestAs(userA, LIABILITY_CLASSES_URL, {
        method: "POST",
        ...jsonBody({ name: "Once Occupied Debt" }),
      }),
    );
    const { id: liabilityClassId } = await created.json();

    const liability = await createLiability(userA, { liability_class_id: liabilityClassId });
    const { id: liabilityId } = await liability.json();

    await ARCHIVE_LIABILITY(
      requestAs(userA, `${LIABILITIES_URL}/${liabilityId}/archive`, { method: "POST" }),
      { params: Promise.resolve({ id: liabilityId }) },
    );

    const deleteResponse = await DELETE_LIABILITY_CLASS(
      requestAs(userA, `${LIABILITY_CLASSES_URL}/${liabilityClassId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: liabilityClassId }) },
    );
    expect(deleteResponse.status).toBe(409);
  });
});
