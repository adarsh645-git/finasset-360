import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE as DELETE_ASSET_CLASS } from "@/app/api/asset-classes/[id]/route";
import { GET, POST } from "@/app/api/asset-classes/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const ASSET_CLASSES_URL = "http://localhost:3000/api/asset-classes";
const HOLDINGS_URL = "http://localhost:3000/api/holdings";

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, exactly like tests/route/portfolio.test.ts.
describe("GET/POST /api/asset-classes, DELETE /api/asset-classes/[id]", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("class-a"), createTestUser("class-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("lists the global default Asset Classes for a fresh User", async () => {
    const response = await GET(requestAs(userA, ASSET_CLASSES_URL));
    expect(response.status).toBe(200);
    const body = await response.json();
    const ids = body.map((c: { id: string }) => c.id);
    expect(ids).toEqual(expect.arrayContaining(Object.values(DEFAULT_ASSET_CLASS_ID)));
    expect(body.every((c: { owner_id: string | null }) => c.owner_id === null)).toBe(true);
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(ASSET_CLASSES_URL));
    expect(response.status).toBe(401);
  });

  it("lets a User create a custom Asset Class", async () => {
    const response = await POST(
      requestAs(userA, ASSET_CLASSES_URL, {
        method: "POST",
        ...jsonBody({ name: "Vintage Watches" }),
      }),
    );
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({ owner_id: userA.id, name: "Vintage Watches" });
  });

  it("rejects an empty name", async () => {
    const response = await POST(
      requestAs(userA, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "   " }) }),
    );
    expect(response.status).toBe(400);
  });

  it("keeps a User's custom Asset Class invisible to another User", async () => {
    const created = await POST(
      requestAs(userA, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Comic Books" }) }),
    );
    const { id } = await created.json();

    const asB = await GET(requestAs(userB, ASSET_CLASSES_URL));
    const idsVisibleToB = (await asB.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToB).not.toContain(id);

    const asA = await GET(requestAs(userA, ASSET_CLASSES_URL));
    const idsVisibleToA = (await asA.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToA).toContain(id);
  });

  it("refuses to delete a global default Asset Class", async () => {
    const response = await DELETE_ASSET_CLASS(
      requestAs(userA, `${ASSET_CLASSES_URL}/${DEFAULT_ASSET_CLASS_ID.cash}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: DEFAULT_ASSET_CLASS_ID.cash }) },
    );
    expect(response.status).toBe(404);

    const stillThere = await GET(requestAs(userA, ASSET_CLASSES_URL));
    const ids = (await stillThere.json()).map((c: { id: string }) => c.id);
    expect(ids).toContain(DEFAULT_ASSET_CLASS_ID.cash);
  });

  it("refuses User A deleting User B's custom Asset Class", async () => {
    const created = await POST(
      requestAs(userB, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Stamp Collection" }) }),
    );
    const { id } = await created.json();

    const response = await DELETE_ASSET_CLASS(
      requestAs(userA, `${ASSET_CLASSES_URL}/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const asB = await GET(requestAs(userB, ASSET_CLASSES_URL));
    const idsVisibleToB = (await asB.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToB).toContain(id);
  });

  it("lets a User delete their own empty custom Asset Class", async () => {
    const created = await POST(
      requestAs(userA, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Throwaway" }) }),
    );
    const { id } = await created.json();

    const response = await DELETE_ASSET_CLASS(
      requestAs(userA, `${ASSET_CLASSES_URL}/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);

    const after = await GET(requestAs(userA, ASSET_CLASSES_URL));
    const ids = (await after.json()).map((c: { id: string }) => c.id);
    expect(ids).not.toContain(id);
  });

  it("refuses to delete an Asset Class that still has Holdings", async () => {
    const created = await POST(
      requestAs(userA, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Occupied Class" }) }),
    );
    const { id: assetClassId } = await created.json();

    const holdingResponse = await POST_HOLDING(
      requestAs(userA, HOLDINGS_URL, {
        method: "POST",
        ...jsonBody({ name: "Something", asset_class_id: assetClassId, currency: "USD" }),
      }),
    );
    expect(holdingResponse.status).toBe(201);

    const deleteResponse = await DELETE_ASSET_CLASS(
      requestAs(userA, `${ASSET_CLASSES_URL}/${assetClassId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: assetClassId }) },
    );
    expect(deleteResponse.status).toBe(409);

    const stillThere = await GET(requestAs(userA, ASSET_CLASSES_URL));
    const ids = (await stillThere.json()).map((c: { id: string }) => c.id);
    expect(ids).toContain(assetClassId);
  });
});
