import "server-only";

import type {
  NotificationChannel,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Notification service.
 *
 * Phase 2 records notifications as rows (the in-app inbox + an audit of what we
 * intended to send by email/SMS). Real delivery (SMTP, SMS gateway, WhatsApp)
 * is wired behind this same interface in Phase 6, so callers never change.
 */

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body: string;
  shopId?: string | null;
  userId?: string | null;
  customerId?: string | null;
  channels?: NotificationChannel[];
  relatedAppointmentId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const DEFAULT_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL"];

/**
 * Create one notification row per channel. In-app notifications are stored as
 * SENT immediately; email/SMS/WhatsApp are marked SENT here as a stand-in for
 * real delivery (swapped for a provider call in Phase 6).
 */
export async function notify(input: NotifyInput): Promise<void> {
  const channels = input.channels ?? DEFAULT_CHANNELS;
  const now = new Date();

  await prisma.notification.createMany({
    data: channels.map((channel) => ({
      channel,
      type: input.type,
      title: input.title,
      body: input.body,
      shopId: input.shopId ?? null,
      userId: input.userId ?? null,
      customerId: input.customerId ?? null,
      relatedAppointmentId: input.relatedAppointmentId ?? null,
      metadata: input.metadata,
      status: "SENT" as const,
      sentAt: now,
    })),
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[notify] ${input.type} → ${channels.join(", ")}: ${input.title}`,
    );
  }
}

/** Mark an in-app notification read (scoped to the owning user). */
export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<boolean> {
  const res = await prisma.notification.updateMany({
    where: { id, userId, channel: "IN_APP" },
    data: { status: "READ", readAt: new Date() },
  });
  return res.count > 0;
}
