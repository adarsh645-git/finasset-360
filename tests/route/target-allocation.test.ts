import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/target-allocation/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const TARGET_ALLOCATION_URL = "http://localhost:3000/api/target-allocation";

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, exactly like tests/route/asset-classes.test.ts.
describe("GET/PUT /api/target-allocation", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([
      createTestUser("target-a"),
      createTestUser("target-b"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("starts empty for a fresh User", async () => {
    const response = await GET(requestAs(userA, TARGET_ALLOCATION_URL));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(TARGET_ALLOCATION_URL));
    expect(response.status).toBe(401);
  });

  it("saves a set of targets and reads them back", async () => {
    const putResponse = await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({
          allocations: [
            { asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 20 },
            { asset_class_id: DEFAULT_ASSET_CLASS_ID.equity, target_percent: 80 },
          ],
        }),
      }),
    );
    expect(putResponse.status).toBe(200);

    const getResponse = await GET(requestAs(userA, TARGET_ALLOCATION_URL));
    const body = await getResponse.json();
    expect(body).toEqual(
      expect.arrayContaining([
        { asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 20 },
        { asset_class_id: DEFAULT_ASSET_CLASS_ID.equity, target_percent: 80 },
      ]),
    );
  });

  it("upserts on a second save rather than duplicating rows", async () => {
    await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 20 }] }),
      }),
    );
    await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 35 }] }),
      }),
    );

    const getResponse = await GET(requestAs(userA, TARGET_ALLOCATION_URL));
    const body = await getResponse.json();
    const cashRows = body.filter(
      (r: { asset_class_id: string }) => r.asset_class_id === DEFAULT_ASSET_CLASS_ID.cash,
    );
    expect(cashRows).toEqual([{ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 35 }]);
  });

  it("does not silently normalise a set that doesn't sum to 100", async () => {
    const putResponse = await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({
          allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 150 }],
        }),
      }),
    );
    expect(putResponse.status).toBe(200);

    const getResponse = await GET(requestAs(userA, TARGET_ALLOCATION_URL));
    const body = await getResponse.json();
    expect(
      body.find((r: { asset_class_id: string }) => r.asset_class_id === DEFAULT_ASSET_CLASS_ID.cash),
    ).toEqual({ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: 150 });
  });

  it("rejects a negative target_percent", async () => {
    const response = await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.cash, target_percent: -5 }] }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects an asset_class_id that isn't visible to the caller", async () => {
    const response = await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: "00000000-0000-0000-0000-000000000000", target_percent: 10 }] }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("keeps User A's Target Allocation invisible and unwritable to User B", async () => {
    await PUT(
      requestAs(userA, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.crypto, target_percent: 42 }] }),
      }),
    );

    const asB = await GET(requestAs(userB, TARGET_ALLOCATION_URL));
    const bodyB = await asB.json();
    expect(
      bodyB.find((r: { asset_class_id: string }) => r.asset_class_id === DEFAULT_ASSET_CLASS_ID.crypto),
    ).toBeUndefined();

    // User B "writing" the same Asset Class id only ever creates/updates
    // their own row (RLS forces user_id = auth.uid() on insert) — it can
    // never touch User A's.
    await PUT(
      requestAs(userB, TARGET_ALLOCATION_URL, {
        method: "PUT",
        ...jsonBody({ allocations: [{ asset_class_id: DEFAULT_ASSET_CLASS_ID.crypto, target_percent: 7 }] }),
      }),
    );

    const asAAfter = await GET(requestAs(userA, TARGET_ALLOCATION_URL));
    const bodyAAfter = await asAAfter.json();
    expect(
      bodyAAfter.find((r: { asset_class_id: string }) => r.asset_class_id === DEFAULT_ASSET_CLASS_ID.crypto),
    ).toEqual({ asset_class_id: DEFAULT_ASSET_CLASS_ID.crypto, target_percent: 42 });
  });
});
