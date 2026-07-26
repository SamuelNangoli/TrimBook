"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { renewSubscription } from "@/server/services/subscription.service";

export type ActionResult = {
  ok: boolean;
  message?: string;
  receipt?: string;
};

/**
 * Owner-initiated renewal. For now this simulates a confirmed payment via the
 * MANUAL provider — the real Mobile Money / Flutterwave collection is wired in
 * Phase 7, at which point the provider webhook calls `renewSubscription`
 * instead. The activation logic is already final: +30 days, features restored,
 * receipt + confirmation generated automatically.
 */
export async function renewNowAction(): Promise<ActionResult> {
  const user = await requireRole("OWNER");
  if (!user.shopId) return { ok: false, message: "No shop found for this account." };

  try {
    const res = await renewSubscription({
      shopId: user.shopId,
      provider: "MANUAL",
      actorId: user.id,
    });
    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: `Payment confirmed. Receipt ${res.receiptNumber}.`,
      receipt: res.receiptNumber,
    };
  } catch (error) {
    console.error("[billing] renewNow failed", error);
    return { ok: false, message: "We couldn't process your renewal. Try again." };
  }
}
