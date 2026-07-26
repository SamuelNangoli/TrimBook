import { NextResponse, type NextRequest } from "next/server";

import { runSubscriptionCheck } from "@/server/services/subscription.service";

/**
 * Automatic subscription checker — runs hourly (see vercel.json).
 *
 * Security: requires `Authorization: Bearer <CRON_SECRET>`. Vercel Cron sends
 * this header automatically when CRON_SECRET is configured. Never expose this
 * without the secret — it mutates every shop's billing state.
 */
export const dynamic = "force-dynamic";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runSubscriptionCheck();
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("[cron] subscription check failed", error);
    return NextResponse.json({ ok: false, error: "Check failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
