import { NextResponse, type NextRequest } from "next/server";

/** A 401 to return as-is unless the request carries the configured cron secret, else null. */
export function rejectWithoutCronSecret(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
