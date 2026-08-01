"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/server/services/notification.service";

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const ok = await markNotificationRead(id, user.id);
  return { ok };
}

export async function markAllReadAction(): Promise<{ ok: boolean; count: number }> {
  const user = await requireUser();
  const count = await markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
  return { ok: true, count };
}
