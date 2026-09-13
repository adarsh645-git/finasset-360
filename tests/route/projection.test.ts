import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/projection/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const PROJECTION_URL = "http://localhost:3000/api/projection";

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, exactly like tests/route/target-allocation.test.ts.
describe("GET/PUT /api/projection", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("projection-a"), createTestUser("projection-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("is null for a fresh User who has never saved the form", async () => {
    const response = await GET(requestAs(userA, PROJECTION_URL));
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(PROJECTION_URL));
    expect(response.status).toBe(401);
  });

  it("saves an assumption set and reads it back", async () => {
    const putResponse = await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.07,
          monthly_contribution: 1500,
          contribution_escalation_rate: 0.03,
          horizon_years: 20,
          inflation_rate: 0.03,
        }),
      }),
    );
    expect(putResponse.status).toBe(200);
    expect(await putResponse.json()).toEqual({
      growth_rate: 0.07,
      monthly_contribution: 1500,
      contribution_escalation_rate: 0.03,
      horizon_years: 20,
      inflation_rate: 0.03,
    });

    const getResponse = await GET(requestAs(userA, PROJECTION_URL));
    expect(await getResponse.json()).toEqual({
      growth_rate: 0.07,
      monthly_contribution: 1500,
      contribution_escalation_rate: 0.03,
      horizon_years: 20,
      inflation_rate: 0.03,
    });
  });

  it("upserts on a second save rather than creating a second scenario", async () => {
    await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.05,
          monthly_contribution: 500,
          contribution_escalation_rate: 0,
          horizon_years: 10,
          inflation_rate: 0.03,
        }),
      }),
    );
    await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.09,
          monthly_contribution: 800,
          contribution_escalation_rate: 0.02,
          horizon_years: 15,
          inflation_rate: 0.04,
        }),
      }),
    );

    const response = await GET(requestAs(userA, PROJECTION_URL));
    expect(await response.json()).toEqual({
      growth_rate: 0.09,
      monthly_contribution: 800,
      contribution_escalation_rate: 0.02,
      horizon_years: 15,
      inflation_rate: 0.04,
    });
  });

  it("rejects a non-integer horizon_years", async () => {
    const response = await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.07,
          monthly_contribution: 100,
          contribution_escalation_rate: 0,
          horizon_years: 10.5,
          inflation_rate: 0.03,
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a negative horizon_years", async () => {
    const response = await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.07,
          monthly_contribution: 100,
          contribution_escalation_rate: 0,
          horizon_years: -1,
          inflation_rate: 0.03,
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a missing field", async () => {
    const response = await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({ growth_rate: 0.07, monthly_contribution: 100, horizon_years: 10 }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("keeps User A's Projection invisible and unwritable to User B", async () => {
    await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.06,
          monthly_contribution: 200,
          contribution_escalation_rate: 0,
          horizon_years: 25,
          inflation_rate: 0.03,
        }),
      }),
    );

    const asB = await GET(requestAs(userB, PROJECTION_URL));
    expect(await asB.json()).toBeNull();

    await PUT(
      requestAs(userB, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.1,
          monthly_contribution: 50,
          contribution_escalation_rate: 0,
          horizon_years: 5,
          inflation_rate: 0.03,
        }),
      }),
    );

    const asAAfter = await GET(requestAs(userA, PROJECTION_URL));
    expect(await asAAfter.json()).toEqual({
      growth_rate: 0.06,
      monthly_contribution: 200,
      contribution_escalation_rate: 0,
      horizon_years: 25,
      inflation_rate: 0.03,
    });
  });

  it("rejects a non-numeric inflation_rate", async () => {
    const response = await PUT(
      requestAs(userA, PROJECTION_URL, {
        method: "PUT",
        ...jsonBody({
          growth_rate: 0.07,
          monthly_contribution: 100,
          contribution_escalation_rate: 0,
          horizon_years: 10,
          inflation_rate: "a lot",
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
