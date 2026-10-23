import { send, type FetchFn, type SaveResult } from "@/lib/views/holding-writes";

// What the Goals page sends to the Goal routes. Free of React so each step is a plain test.

/** A typed target without `$`, commas or spaces; null unless it is a finite number above 0 (GO-10). */
export function parseGoalTarget(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Posts a new Goal. A bad target sends nothing and returns `error: null`, so the
 * form keeps its text without a message (D6). A failed request carries the route's message.
 */
export async function saveGoal(
  fetchFn: FetchFn,
  name: string,
  rawTarget: string,
): Promise<SaveResult | { ok: false; error: null }> {
  const target = parseGoalTarget(rawTarget);
  if (target === null) return { ok: false, error: null };
  const trimmed = name.trim();
  return send(fetchFn, "POST", "/api/goals", {
    ...(trimmed ? { name: trimmed } : {}),
    target_usd: target,
  });
}

/** Deletes a Goal for good (GO-12). */
export function removeGoal(fetchFn: FetchFn, id: string): Promise<SaveResult> {
  return send(fetchFn, "DELETE", `/api/goals/${id}`);
}
