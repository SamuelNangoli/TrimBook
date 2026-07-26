"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import {
  activateSubscription,
  suspendSubscription,
  extendSubscription,
  grantComplimentary,
  cancelSubscription,
} from "@/server/services/subscription.service";

export type AdminActionResult = { ok: boolean; message: string };

/** Every action re-checks SUPER_ADMIN on the server — the UI never gates alone. */
async function guard() {
  const user = await requireRole("SUPER_ADMIN");
  return user.id;
}

function revalidate() {
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
}

export async function adminActivate(shopId: string): Promise<AdminActionResult> {
  const actorId = await guard();
  await activateSubscription(shopId, actorId);
  revalidate();
  return { ok: true, message: "Subscription activated." };
}

export async function adminSuspend(shopId: string): Promise<AdminActionResult> {
  const actorId = await guard();
  await suspendSubscription(shopId, actorId);
  revalidate();
  return { ok: true, message: "Subscription suspended." };
}

export async function adminExtend(
  shopId: string,
  days: number,
): Promise<AdminActionResult> {
  const actorId = await guard();
  const d = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
  await extendSubscription(shopId, d, actorId);
  revalidate();
  return { ok: true, message: `Extended by ${d} days.` };
}

export async function adminComp(
  shopId: string,
  days: number,
): Promise<AdminActionResult> {
  const actorId = await guard();
  const d = Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
  await grantComplimentary(shopId, d, actorId);
  revalidate();
  return { ok: true, message: `Granted ${d} complimentary days.` };
}

export async function adminCancel(shopId: string): Promise<AdminActionResult> {
  const actorId = await guard();
  await cancelSubscription(shopId, actorId);
  revalidate();
  return { ok: true, message: "Subscription cancelled." };
}
