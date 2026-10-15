import { NextResponse, type NextRequest } from "next/server";
import { rejectWithoutCronSecret } from "@/lib/http/cron-auth";

// GET /api/cron/daily — the secret guard only. The FX, price and snapshot
// steps arrive with the daily-job ticket (tasks.md section 8).
export async function GET(request: NextRequest) {
  const rejection = rejectWithoutCronSecret(request);
  if (rejection) return rejection;
  return NextResponse.json({});
}
