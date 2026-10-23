import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET as getPortfolio } from "@/app/api/portfolio/route";
import { POST as updateValue } from "@/app/api/holdings/[id]/valuations/route";
import { POST as updateBalance } from "@/app/api/liabilities/[id]/valuations/route";
import type { PortfolioData } from "@/lib/read-model/types";
import { buildStaleList } from "@/lib/views/stale-list";
import { jsonBody, requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 2 (design.md Testing Decisions): the pass relies on a save of an
// unchanged figure making the item fresh. Saved through the existing routes,
// read back through GET /api/portfolio.

const BASE = "http://localhost:3000/api";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("update-pass");
});

afterAll(async () => {
  await deleteTestUser(user.id);
});

async function read(): Promise<PortfolioData> {
  const response = await getPortfolio(requestAs(user, `${BASE}/portfolio`));
  expect(response.status).toBe(200);
  return (await response.json()) as PortfolioData;
}

const staleIds = (data: PortfolioData) => buildStaleList(data, data.today).map((r) => r.id);

describe("Save & next records an unchanged figure", () => {
  it("UP-05 an unchanged value posted to the Holding Valuation route makes the Holding fresh", async () => {
    const db = admin();
    const { data: row, error } = await db
      .from("holding")
      .insert({ user_id: user.id, country: "US", asset_class: "cash", name: "Pass cash" })
      .select("id")
      .single();
    if (error) throw error;
    const id = row.id as string;
    const seeded = await db
      .from("holding_valuation")
      .insert({ user_id: user.id, holding_id: id, valued_on: daysAgo(90), value: 18_000, source: "user" })
      .select("id");
    if (seeded.error) throw seeded.error;
    expect(staleIds(await read())).toContain(id);

    const response = await updateValue(
      requestAs(user, `${BASE}/holdings/${id}/valuations`, { method: "POST", ...jsonBody({ value: 18_000 }) }),
      ctx(id),
    );
    expect(response.status).toBeLessThan(300);

    const after = await read();
    expect(staleIds(after)).not.toContain(id);
    expect(after.holdings.find((h) => h.id === id)!.valuations.map((v) => [v.date, v.value])).toEqual([
      [daysAgo(90), 18_000],
      [daysAgo(0), 18_000],
    ]);
  });

  it("UP-05 an unchanged balance posted to the Liability Valuation route makes the Liability fresh", async () => {
    const db = admin();
    const { data: row, error } = await db
      .from("liability")
      .insert({
        user_id: user.id,
        country: "US",
        name: "Pass loan",
        principal: 250_000,
        apr: 5,
        monthly_payment: 1_500,
        start_month: "2026-01-01",
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = row.id as string;
    const seeded = await db
      .from("liability_valuation")
      .insert({ user_id: user.id, liability_id: id, valued_on: daysAgo(90), balance: 212_400 })
      .select("id");
    if (seeded.error) throw seeded.error;
    expect(staleIds(await read())).toContain(id);

    const response = await updateBalance(
      requestAs(user, `${BASE}/liabilities/${id}/valuations`, { method: "POST", ...jsonBody({ balance: 212_400 }) }),
      ctx(id),
    );
    expect(response.status).toBeLessThan(300);

    const after = await read();
    expect(staleIds(after)).not.toContain(id);
    expect(after.liabilities.find((l) => l.id === id)!.valuations.map((v) => [v.date, v.value])).toEqual([
      [daysAgo(90), 212_400],
      [daysAgo(0), 212_400],
    ]);
  });
});
