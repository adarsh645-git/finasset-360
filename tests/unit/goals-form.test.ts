import { describe, expect, it } from "vitest";
import { displayName } from "@/lib/views/goals";
import { parseGoalTarget, removeGoal, saveGoal } from "@/lib/views/goal-writes";

describe("goal target parsing and saving", () => {
  it.each([
    ["$150,000", 150_000],
    ["250 000", 250_000],
    ["1500.50", 1500.5],
    ["", null],
    ["0", null],
    ["-5000", null],
    ["150k", null],
  ])("GO-10 target text %j parses to %s", (text, parsed) => {
    expect(parseGoalTarget(text)).toBe(parsed);
  });

  const okFetch = () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: "g1" }), { status: 201 });
    };
    return { calls, fetchFn };
  };

  it("GO-10 a valid target posts the trimmed name and the target", async () => {
    const { calls, fetchFn } = okFetch();
    const saved = await saveGoal(fetchFn, "  Emergency fund ", "$150,000");
    expect(saved.ok).toBe(true);
    expect(calls[0].url).toBe("/api/goals");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ name: "Emergency fund", target_usd: 150_000 });
  });

  it("GO-10 a blank name is sent as no name", async () => {
    const { calls, fetchFn } = okFetch();
    await saveGoal(fetchFn, "   ", "2500");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ target_usd: 2500 });
  });

  it.each(["", "0", "-5000", "150k"])("GO-10 target text %j posts nothing", async (text) => {
    const { calls, fetchFn } = okFetch();
    expect(await saveGoal(fetchFn, "Name", text)).toEqual({ ok: false, error: null });
    expect(calls).toHaveLength(0);
  });

  it("GO-10 a failed request returns the route's message", async () => {
    const fetchFn = async () => new Response(JSON.stringify({ error: "Could not save." }), { status: 500 });
    expect(await saveGoal(fetchFn, "x", "100")).toEqual({ ok: false, error: "Could not save." });
  });

  it("GO-12 Remove calls DELETE on the Goal's route", async () => {
    const { calls, fetchFn } = okFetch();
    const removed = await removeGoal(fetchFn, "g1");
    expect(removed.ok).toBe(true);
    expect(calls[0].url).toBe("/api/goals/g1");
    expect(calls[0].init.method).toBe("DELETE");
  });
});

describe("goal display name", () => {
  it.each([
    [null, 150_000, "$150K net worth"],
    ["   ", 2_500, "$2.5K net worth"],
    [null, 1_284_300, "$1.28M net worth"],
    ["  Emergency fund  ", 30_000, "Emergency fund"],
  ])("GO-11 name %j with target %s is shown as %s", (name, targetUsd, shown) => {
    expect(displayName({ name, targetUsd })).toBe(shown);
  });
});
