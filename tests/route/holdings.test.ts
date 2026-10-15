import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST as createHolding } from "@/app/api/holdings/route";
import { PATCH as editHolding } from "@/app/api/holdings/[id]/route";
import { POST as updateValue } from "@/app/api/holdings/[id]/valuations/route";
import { POST as archiveHolding } from "@/app/api/holdings/[id]/archive/route";
import { jsonBody, requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 1 (design.md Testing Decisions): the manually valued Holding routes
// against the real local Postgres with RLS on. Database state is read back
// with the service-role client only to see what a route wrote.

const BASE = "http://localhost:3000/api/holdings";
const today = new Date().toISOString().slice(0, 10);

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("holdings");
});

afterAll(async () => {
  await deleteTestUser(user.id);
});

type Body = Record<string, unknown>;

async function create(body: Body) {
  const response = await createHolding(requestAs(user, BASE, { method: "POST", ...jsonBody(body) }));
  return { status: response.status, json: (await response.json()) as { id?: string; error?: string } };
}

const cash = (overrides: Body = {}): Body => ({
  asset_class: "cash",
  country: "US",
  name: "Chase Checking",
  value: 6200,
  ...overrides,
});

async function createdId(body: Body): Promise<string> {
  const { status, json } = await create(body);
  if (status !== 201 || !json.id) throw new Error(`setup create failed: ${status} ${json.error}`);
  return json.id;
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function send(
  handler: (request: ReturnType<typeof requestAs>, context: ReturnType<typeof ctx>) => Promise<Response>,
  id: string,
  suffix: string,
  method: string,
  body?: Body,
) {
  const response = await handler(
    requestAs(user, `${BASE}/${id}${suffix}`, { method, ...(body ? jsonBody(body) : {}) }),
    ctx(id),
  );
  return { status: response.status, json: (await response.json()) as { id?: string; error?: string } };
}

const edit = (id: string, body: Body) => send(editHolding, id, "", "PATCH", body);
const update = (id: string, value: unknown) => send(updateValue, id, "/valuations", "POST", { value });
const archive = (id: string) => send(archiveHolding, id, "/archive", "POST");

async function holdingRow(id: string) {
  const { data, error } = await admin().from("holding").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function valuations(id: string) {
  const { data, error } = await admin()
    .from("holding_valuation")
    .select("valued_on, value, source")
    .eq("holding_id", id)
    .order("valued_on");
  if (error) throw error;
  return data.map((row) => ({ valued_on: row.valued_on as string, value: Number(row.value), source: row.source as string }));
}

async function holdingCount(name: string) {
  const { count, error } = await admin()
    .from("holding")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("name", name);
  if (error) throw error;
  return count ?? 0;
}

async function backdateValuations(id: string, days: number) {
  const { error } = await admin()
    .from("holding_valuation")
    .update({ valued_on: daysAgo(days) })
    .eq("holding_id", id);
  if (error) throw error;
}

describe("DM-06 An unknown Country or Asset Class is rejected", () => {
  it.each([
    ["US", "cash", 201],
    ["IN", "realestate", 201],
    ["UK", "cash", 400],
    ["US", "equity", 400],
  ])("DM-06 country %s with class %s answers %i", async (country, assetClass, status) => {
    const result = await create(cash({ country, asset_class: assetClass, name: `DM-06 ${country} ${assetClass}` }));
    expect(result.status).toBe(status);
    if (status === 400) expect(result.json.error).toBeTruthy();
  });
});

describe("DM-07 Creating a Cash Holding", () => {
  it("DM-07 stores the Holding and one Valuation of today", async () => {
    const result = await create(cash({ name: "DM-07 Chase Checking", description: "Everyday account" }));
    expect(result.status).toBe(201);
    const row = await holdingRow(result.json.id!);
    expect(row).toMatchObject({
      name: "DM-07 Chase Checking",
      description: "Everyday account",
      country: "US",
      asset_class: "cash",
      cost_basis: null,
    });
    expect(await valuations(result.json.id!)).toEqual([{ valued_on: today, value: 6200, source: "user" }]);
  });
});

describe("DM-08 Invalid Holding input is rejected with a reason", () => {
  async function storedCounts() {
    const holdings = await admin().from("holding").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    const valuationRows = await admin()
      .from("holding_valuation")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    return [holdings.count, valuationRows.count];
  }

  it.each<[string, Body]>([
    ["name blank", { name: "  " }],
    ["value missing", { value: undefined }],
    ["value -1", { value: -1 }],
    ["cost basis -5", { cost_basis: -5 }],
  ])("DM-08 %s", async (label, overrides) => {
    const before = await storedCounts();
    const result = await create(cash({ name: "DM-08 rejected", ...overrides }));
    expect(result.status).toBe(400);
    expect(result.json.error).toBeTruthy();
    expect(await storedCounts()).toEqual(before);
    expect(label).toBeTruthy();
  });
});

describe("DM-09 A blank Description is not stored", () => {
  it.each(["", "   "])("DM-09 description %j", async (description) => {
    const result = await create(cash({ name: "DM-09 blank description", description }));
    expect(result.status).toBe(201);
    expect((await holdingRow(result.json.id!)).description).toBeNull();
  });
});

describe("DM-10 Real estate takes a Property type and city", () => {
  it("DM-10 defaults the Property type to Residential", async () => {
    const result = await create({
      asset_class: "realestate",
      country: "IN",
      name: "DM-10 Pune apartment",
      value: 6_200_000,
      cost_basis: 4_800_000,
      city: "Pune",
    });
    expect(result.status).toBe(201);
    expect(await holdingRow(result.json.id!)).toMatchObject({
      property_type: "Residential",
      city: "Pune",
      cost_basis: 4_800_000,
    });
  });
});

describe("DM-11 Metals take a quantity and unit", () => {
  it("DM-11 stores quantity 20 in oz t and value 640", async () => {
    const result = await create({
      asset_class: "metals",
      country: "US",
      name: "DM-11 Silver Eagles",
      value: 640,
      quantity: 20,
      unit: "oz t",
    });
    expect(result.status).toBe(201);
    expect(await holdingRow(result.json.id!)).toMatchObject({ quantity: 20, unit: "oz t" });
    expect((await valuations(result.json.id!))[0].value).toBe(640);
  });
});

describe("DM-12 Fields of another Asset Class are rejected", () => {
  it.each<[string, Body]>([
    ["cash", { property_type: "Land" }],
    ["crypto", { quantity: 2 }],
    ["realestate", { property_type: "Castle" }],
    ["metals", { unit: "kg", quantity: 1 }],
  ])("DM-12 %s with %j", async (assetClass, extra) => {
    const result = await create(cash({ asset_class: assetClass, name: `DM-12 ${assetClass}`, ...extra }));
    expect(result.status).toBe(400);
    expect(result.json.error).toBeTruthy();
    expect(await holdingCount(`DM-12 ${assetClass}`)).toBe(0);
  });
});

describe("DM-13 An unchanged value still records today", () => {
  it("DM-13 adds a second Valuation dated today", async () => {
    const id = await createdId(cash({ name: "DM-13 cash" }));
    await backdateValuations(id, 40);
    const result = await update(id, 6200);
    expect(result.status).toBe(200);
    expect(await valuations(id)).toEqual([
      { valued_on: daysAgo(40), value: 6200, source: "user" },
      { valued_on: today, value: 6200, source: "user" },
    ]);
  });
});

describe("DM-14 A same-day save overwrites", () => {
  it("DM-14 keeps exactly one Valuation dated today, of 6,500", async () => {
    const id = await createdId(cash({ name: "DM-14 cash" }));
    expect((await update(id, 6000)).status).toBe(200);
    expect((await update(id, 6500)).status).toBe(200);
    expect(await valuations(id)).toEqual([{ valued_on: today, value: 6500, source: "user" }]);
  });
});

describe("DM-15 A Stocks Holding has no Update value", () => {
  it("DM-15 rejects Update value for Stocks", async () => {
    const { data, error } = await admin()
      .from("holding")
      .insert({ user_id: user.id, country: "US", asset_class: "stocks", name: "DM-15 brokerage" })
      .select("id")
      .single();
    if (error) throw error;
    const result = await update(data.id, 10_000);
    expect(result.status).toBe(400);
    expect(result.json.error).toBeTruthy();
    expect(await valuations(data.id)).toEqual([]);
  });
});

describe("DM-16 Renaming records today's value too", () => {
  it("DM-16 renames and adds today's Valuation of 8,600", async () => {
    const id = await createdId({ asset_class: "crypto", country: "US", name: "DM-16 Coinbase", value: 8600 });
    await backdateValuations(id, 10);
    const result = await edit(id, { asset_class: "crypto", country: "US", name: "DM-16 Coinbase wallet", value: 8600 });
    expect(result.status).toBe(200);
    expect((await holdingRow(id)).name).toBe("DM-16 Coinbase wallet");
    expect(await valuations(id)).toEqual([
      { valued_on: daysAgo(10), value: 8600, source: "user" },
      { valued_on: today, value: 8600, source: "user" },
    ]);
  });
});

describe("DM-17 Country and Asset Class can't change", () => {
  it.each<[string, Body]>([
    ["Country India", { country: "IN" }],
    ["Asset Class Crypto", { asset_class: "crypto" }],
  ])("DM-17 %s is rejected and the Holding is unchanged", async (_label, change) => {
    const id = await createdId(cash({ name: `DM-17 ${_label}` }));
    const before = await holdingRow(id);
    const result = await edit(id, cash({ name: "DM-17 renamed", ...change }));
    expect(result.status).toBe(400);
    expect(result.json.error).toBeTruthy();
    expect(await holdingRow(id)).toEqual(before);
    expect(await valuations(id)).toHaveLength(1);
  });
});

describe("DM-27 An archived Holding is read-only", () => {
  it("DM-27 refuses edit and Update value with 409 and records no Valuation", async () => {
    const id = await createdId(cash({ name: "DM-27 cash" }));
    expect((await archive(id)).status).toBe(200);
    expect((await holdingRow(id)).archived_at).not.toBeNull();

    expect((await edit(id, cash({ name: "DM-27 renamed" }))).status).toBe(409);
    expect((await update(id, 7000)).status).toBe(409);
    expect(await valuations(id)).toEqual([{ valued_on: today, value: 6200, source: "user" }]);
    expect((await holdingRow(id)).name).toBe("DM-27 cash");
  });
});
