import { NextResponse, type NextRequest } from "next/server";

import { runAppointmentReminders } from "@/server/services/booking.service";

/**
 * Appointment reminders — runs hourly (see vercel.json). Sends 24h and 2h
 * reminders for upcoming appointments, de-duplicated via reminderXSentAt.
 *
 * Security: requires `Authorization: Bearer <CRON_SECRET>`.
 */
export const dynamic = "force-dynamic";

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runAppointmentReminders();
    return NextResponse.json({ ok: true, ...summary, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("[cron] reminders failed", error);
    return NextResponse.json({ ok: false, error: "Reminder run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
