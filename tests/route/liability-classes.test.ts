import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE as DELETE_LIABILITY_CLASS } from "@/app/api/liability-classes/[id]/route";
import { GET, POST } from "@/app/api/liability-classes/route";
import { POST as POST_LIABILITY } from "@/app/api/liabilities/route";
import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const LIABILITY_CLASSES_URL = "http://localhost:3000/api/liability-classes";
const LIABILITIES_URL = "http://localhost:3000/api/liabilities";

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled — mirrors tests/route/asset-classes.test.ts.
describe("GET/POST /api/liability-classes, DELETE /api/liability-classes/[id]", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([
      createTestUser("liability-class-a"),
      createTestUser("liability-class-b"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("lists the global default Liability Classes for a fresh User", async () => {
    const response = await GET(requestAs(userA, LIABILITY_CLASSES_URL));
    expect(response.status).toBe(200);
    const body = await response.json();
    const ids = body.map((c: { id: string }) => c.id);
    expect(ids).toEqual(expect.arrayContaining(Object.values(DEFAULT_LIABILITY_CLASS_ID)));
    expect(body.every((c: { owner_id: string | null }) => c.owner_id === null)).toBe(true);
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(LIABILITY_CLASSES_URL));
    expect(response.status).toBe(401);
  });

  it("lets a User create a custom Liability Class", async () => {
    const response = await POST(
      requestAs(userA, LIABILITY_CLASSES_URL, {
        method: "POST",
        ...jsonBody({ name: "Personal Loan" }),
      }),
    );
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({ owner_id: userA.id, name: "Personal Loan" });
  });

  it("rejects an empty name", async () => {
    const response = await POST(
      requestAs(userA, LIABILITY_CLASSES_URL, { method: "POST", ...jsonBody({ name: "   " }) }),
    );
    expect(response.status).toBe(400);
  });

  it("keeps a User's custom Liability Class invisible to another User", async () => {
    const created = await POST(
      requestAs(userA, LIABILITY_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Family Loan" }) }),
    );
    const { id } = await created.json();

    const asB = await GET(requestAs(userB, LIABILITY_CLASSES_URL));
    const idsVisibleToB = (await asB.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToB).not.toContain(id);

    const asA = await GET(requestAs(userA, LIABILITY_CLASSES_URL));
    const idsVisibleToA = (await asA.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToA).toContain(id);
  });

  it("refuses to delete a global default Liability Class", async () => {
    const response = await DELETE_LIABILITY_CLASS(
      requestAs(userA, `${LIABILITY_CLASSES_URL}/${DEFAULT_LIABILITY_CLASS_ID.creditCard}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: DEFAULT_LIABILITY_CLASS_ID.creditCard }) },
    );
    expect(response.status).toBe(404);

    const stillThere = await GET(requestAs(userA, LIABILITY_CLASSES_URL));
    const ids = (await stillThere.json()).map((c: { id: string }) => c.id);
    expect(ids).toContain(DEFAULT_LIABILITY_CLASS_ID.creditCard);
  });

  it("refuses User A deleting User B's custom Liability Class", async () => {
    const created = await POST(
      requestAs(userB, LIABILITY_CLASSES_URL, { method: "POST", ...jsonBody({ name: "B's loan" }) }),
    );
    const { id } = await created.json();

    const response = await DELETE_LIABILITY_CLASS(
      requestAs(userA, `${LIABILITY_CLASSES_URL}/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const asB = await GET(requestAs(userB, LIABILITY_CLASSES_URL));
    const idsVisibleToB = (await asB.json()).map((c: { id: string }) => c.id);
    expect(idsVisibleToB).toContain(id);
  });

  it("lets a User delete their own empty custom Liability Class", async () => {
    const created = await POST(
      requestAs(userA, LIABILITY_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Throwaway" }) }),
    );
    const { id } = await created.json();

    const response = await DELETE_LIABILITY_CLASS(
      requestAs(userA, `${LIABILITY_CLASSES_URL}/${id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);

    const after = await GET(requestAs(userA, LIABILITY_CLASSES_URL));
    const ids = (await after.json()).map((c: { id: string }) => c.id);
    expect(ids).not.toContain(id);
  });

  it("refuses to delete a Liability Class that still has Liabilities", async () => {
    const created = await POST(
      requestAs(userA, LIABILITY_CLASSES_URL, { method: "POST", ...jsonBody({ name: "Occupied Class" }) }),
    );
    const { id: liabilityClassId } = await created.json();

    const liabilityResponse = await POST_LIABILITY(
      requestAs(userA, LIABILITIES_URL, {
        method: "POST",
        ...jsonBody({ name: "Something owed", liability_class_id: liabilityClassId, currency: "USD" }),
      }),
    );
    expect(liabilityResponse.status).toBe(201);

    const deleteResponse = await DELETE_LIABILITY_CLASS(
      requestAs(userA, `${LIABILITY_CLASSES_URL}/${liabilityClassId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: liabilityClassId }) },
    );
    expect(deleteResponse.status).toBe(409);

    const stillThere = await GET(requestAs(userA, LIABILITY_CLASSES_URL));
    const ids = (await stillThere.json()).map((c: { id: string }) => c.id);
    expect(ids).toContain(liabilityClassId);
  });
});
