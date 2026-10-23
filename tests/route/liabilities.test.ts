import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST as createHolding } from "@/app/api/holdings/route";
import { POST as archiveHolding } from "@/app/api/holdings/[id]/archive/route";
import { POST as createLiability } from "@/app/api/liabilities/route";
import { PATCH as editLiability } from "@/app/api/liabilities/[id]/route";
import { POST as updateBalance } from "@/app/api/liabilities/[id]/valuations/route";
import { POST as archiveLiability } from "@/app/api/liabilities/[id]/archive/route";
import { jsonBody, requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 1 (design.md Testing Decisions): the Liability routes against the real
// local Postgres with RLS on. Database state is read back with the
// service-role client only to see what a route wrote.

const BASE = "http://localhost:3000/api/liabilities";
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
let other: TestUser;

beforeAll(async () => {
  user = await createTestUser("liabilities");
  other = await createTestUser("liabilities-other");
});

afterAll(async () => {
  await deleteTestUser(user.id);
  await deleteTestUser(other.id);
});

type Body = Record<string, unknown>;
type Result = { status: number; json: { id?: string; error?: string } };

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function asResult(response: Response): Promise<Result> {
  return { status: response.status, json: (await response.json()) as Result["json"] };
}

async function create(body: Body, as: TestUser = user) {
  return asResult(await createLiability(requestAs(as, BASE, { method: "POST", ...jsonBody(body) })));
}

const loan = (overrides: Body = {}): Body => ({
  country: "US",
  name: "Student loan",
  balance: 13900,
  principal: 32000,
  apr: 4.5,
  monthly_payment: 330,
  term_years: 10,
  start_month: "2021-03",
  ...overrides,
});

async function createdId(body: Body): Promise<string> {
  const { status, json } = await create(body);
  if (status !== 201 || !json.id) throw new Error(`setup create failed: ${status} ${json.error}`);
  return json.id;
}

async function createHoldingFor(as: TestUser, name: string): Promise<string> {
  const response = await createHolding(
    requestAs(as, "http://localhost:3000/api/holdings", {
      method: "POST",
      ...jsonBody({ asset_class: "realestate", country: "US", name, value: 400000 }),
    }),
  );
  const json = (await response.json()) as { id: string };
  if (response.status !== 201) throw new Error(`holding setup failed: ${response.status}`);
  return json.id;
}

const edit = async (id: string, body: Body) =>
  asResult(await editLiability(requestAs(user, `${BASE}/${id}`, { method: "PATCH", ...jsonBody(body) }), ctx(id)));
const setBalance = async (id: string, balance: unknown) =>
  asResult(
    await updateBalance(requestAs(user, `${BASE}/${id}/valuations`, { method: "POST", ...jsonBody({ balance }) }), ctx(id)),
  );
const archive = async (id: string) =>
  asResult(await archiveLiability(requestAs(user, `${BASE}/${id}/archive`, { method: "POST" }), ctx(id)));
const archiveHoldingById = async (id: string) =>
  asResult(
    await archiveHolding(requestAs(user, `http://localhost:3000/api/holdings/${id}/archive`, { method: "POST" }), ctx(id)),
  );

async function liabilityRow(id: string) {
  const { data, error } = await admin().from("liability").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function balances(id: string) {
  const { data, error } = await admin()
    .from("liability_valuation")
    .select("valued_on, balance")
    .eq("liability_id", id)
    .order("valued_on");
  if (error) throw error;
  return data.map((row) => ({ valued_on: row.valued_on as string, balance: Number(row.balance) }));
}

describe("DM-28 Creating a loan", () => {
  it("DM-28 stores the figures, is not revolving, has no link and one balance Valuation dated today", async () => {
    const { status, json } = await create(loan());
    expect(status).toBe(201);
    const row = await liabilityRow(json.id!);
    expect(row).toMatchObject({
      country: "US",
      name: "Student loan",
      revolving: false,
      linked_holding_id: null,
      start_month: "2021-03-01",
    });
    expect(Number(row.apr)).toBe(4.5);
    expect(Number(row.monthly_payment)).toBe(330);
    expect(Number(row.term_years)).toBe(10);
    expect(Number(row.principal)).toBe(32000);
    expect(await balances(json.id!)).toEqual([{ valued_on: today, balance: 13900 }]);
  });
});

describe("DM-29 Liability input rules", () => {
  it.each([
    { balance: 1850, principal: undefined, apr: 24.9, payment: 150, status: 201, stored: 1850 },
    { balance: 9100, principal: 5000, apr: 5.9, payment: 501, status: 201, stored: 9100 },
    { balance: -1, principal: undefined, apr: 5, payment: 100, status: 400, stored: null },
    { balance: 1000, principal: undefined, apr: -1, payment: 100, status: 400, stored: null },
    { balance: 1000, principal: undefined, apr: 5, payment: 0, status: 400, stored: null },
  ])("DM-29 balance $balance principal $principal apr $apr payment $payment gives $status", async (row) => {
    const { status, json } = await create(
      loan({ balance: row.balance, principal: row.principal, apr: row.apr, monthly_payment: row.payment }),
    );
    expect(status).toBe(row.status);
    if (row.stored !== null) expect(Number((await liabilityRow(json.id!)).principal)).toBe(row.stored);
  });
});

describe("DM-30 The start month defaults to this month", () => {
  it("DM-30 stores the first of the current month and defaults revolving to off", async () => {
    const { json } = await create(loan({ start_month: undefined, term_years: undefined }));
    const row = await liabilityRow(json.id!);
    expect(row.start_month).toBe(`${today.slice(0, 7)}-01`);
    expect(row.revolving).toBe(false);
    expect(row.term_years).toBeNull();
  });
});

describe("DM-31 A balance edit records today's Valuation", () => {
  it("DM-31 adds today's Valuation then replaces it on a same-day edit", async () => {
    const id = await createdId(loan({ name: "DM-31 loan", balance: 9100 }));
    await admin().from("liability_valuation").update({ valued_on: daysAgo(35) }).eq("liability_id", id);

    expect((await setBalance(id, 8650)).status).toBe(200);
    expect(await balances(id)).toEqual([
      { valued_on: daysAgo(35), balance: 9100 },
      { valued_on: today, balance: 8650 },
    ]);

    expect((await setBalance(id, 8600)).status).toBe(200);
    expect(await balances(id)).toEqual([
      { valued_on: daysAgo(35), balance: 9100 },
      { valued_on: today, balance: 8600 },
    ]);
    expect((await setBalance(id, -5)).status).toBe(400);
  });

  it("DM-31 a PATCH also upserts today's balance Valuation", async () => {
    const id = await createdId(loan({ name: "DM-31 patch" }));
    expect((await edit(id, loan({ name: "DM-31 patch", balance: 12000 }))).status).toBe(200);
    expect(await balances(id)).toEqual([{ valued_on: today, balance: 12000 }]);
  });
});

describe("DM-32 Which Holdings can be linked", () => {
  it("DM-32 accepts an active Holding and rejects archived, already-linked and other Users' Holdings", async () => {
    const h = await createHoldingFor(user, "DM-32 H");
    const archived = await createHoldingFor(user, "DM-32 A");
    const linked = await createHoldingFor(user, "DM-32 L");
    const foreign = await createHoldingFor(other, "DM-32 X");
    expect((await archiveHoldingById(archived)).status).toBe(200);
    await createdId(loan({ name: "DM-32 existing", linked_holding_id: linked }));

    const ok = await create(loan({ name: "DM-32 ok", linked_holding_id: h }));
    expect(ok.status).toBe(201);
    expect((await liabilityRow(ok.json.id!)).linked_holding_id).toBe(h);

    expect((await create(loan({ linked_holding_id: archived }))).status).toBe(400);
    expect((await create(loan({ linked_holding_id: linked }))).status).toBe(400);
    expect((await create(loan({ linked_holding_id: foreign }))).status).toBe(400);
  });
});

describe("DM-26 Archiving a financed Holding", () => {
  it("DM-26 unlinks the Liability and keeps the Holding's Valuations", async () => {
    const h = await createHoldingFor(user, "DM-26 house");
    const id = await createdId(loan({ name: "DM-26 mortgage", linked_holding_id: h }));
    expect((await archiveHoldingById(h)).status).toBe(200);

    expect((await liabilityRow(id)).linked_holding_id).toBeNull();
    const { data } = await admin().from("holding").select("archived_at").eq("id", h).single();
    expect(data!.archived_at).not.toBeNull();
    const { count } = await admin()
      .from("holding_valuation")
      .select("id", { count: "exact", head: true })
      .eq("holding_id", h);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe("DM-33 Archiving a paid-off loan", () => {
  it("DM-33 keeps Valuations and link, and refuses later edits with 409", async () => {
    const h = await createHoldingFor(user, "DM-33 house");
    const id = await createdId(loan({ name: "DM-33 loan", linked_holding_id: h }));
    await admin().from("liability_valuation").update({ valued_on: daysAgo(40) }).eq("liability_id", id);
    expect((await setBalance(id, 5000)).status).toBe(200);

    expect((await archive(id)).status).toBe(200);
    const row = await liabilityRow(id);
    expect(row.archived_at).not.toBeNull();
    expect(row.linked_holding_id).toBe(h);
    expect(await balances(id)).toHaveLength(2);

    expect((await edit(id, loan({ name: "renamed" }))).status).toBe(409);
    expect((await setBalance(id, 10)).status).toBe(409);
    expect((await liabilityRow(id)).name).toBe("DM-33 loan");
    expect(await balances(id)).toHaveLength(2);
  });
});
