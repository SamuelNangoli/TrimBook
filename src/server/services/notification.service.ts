import "server-only";

import type {
  NotificationChannel,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getProvider } from "@/server/notifications/providers";

/**
 * Notification service.
 *
 * Creates one Notification row per channel (the in-app inbox + a delivery log),
 * and for non-in-app channels actually dispatches through the provider layer
 * (email/SMS/WhatsApp), recording SENT or FAILED. In-app notifications are
 * stored SENT for the bell menu.
 */

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body: string;
  shopId?: string | null;
  userId?: string | null;
  customerId?: string | null;
  channels?: NotificationChannel[];
  /** Explicit recipient overrides; otherwise resolved from user/customer. */
  toEmail?: string | null;
  toPhone?: string | null;
  relatedAppointmentId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const DEFAULT_CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL"];

/** Look up email/phone for the recipient when not provided explicitly. */
async function resolveContact(input: NotifyInput): Promise<{ email: string | null; phone: string | null }> {
  let email = input.toEmail ?? null;
  let phone = input.toPhone ?? null;

  if ((!email || !phone) && input.userId) {
    const u = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, phone: true },
    });
    email = email ?? u?.email ?? null;
    phone = phone ?? u?.phone ?? null;
  }
  if ((!email || !phone) && input.customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: input.customerId },
      select: { email: true, phone: true },
    });
    email = email ?? c?.email ?? null;
    phone = phone ?? c?.phone ?? null;
  }
  return { email, phone };
}

export async function notify(input: NotifyInput): Promise<void> {
  const channels = input.channels ?? DEFAULT_CHANNELS;
  const now = new Date();
  const needsContact = channels.some((c) => c !== "IN_APP");
  const contact = needsContact
    ? await resolveContact(input)
    : { email: null, phone: null };

  for (const channel of channels) {
    const base = {
      channel,
      type: input.type,
      title: input.title,
      body: input.body,
      shopId: input.shopId ?? null,
      userId: input.userId ?? null,
      customerId: input.customerId ?? null,
      relatedAppointmentId: input.relatedAppointmentId ?? null,
      metadata: input.metadata,
    };

    if (channel === "IN_APP") {
      await prisma.notification.create({ data: { ...base, status: "SENT", sentAt: now } });
      continue;
    }

    const to = channel === "EMAIL" ? contact.email : contact.phone;
    const result = await getProvider(channel).send(to ?? "", input.title, input.body);

    await prisma.notification.create({
      data: {
        ...base,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? now : null,
        error: result.ok ? null : result.error ?? "Delivery failed",
      },
    });
  }
}

/** Mark an in-app notification read (scoped to the owning user). */
export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  const res = await prisma.notification.updateMany({
    where: { id, userId, channel: "IN_APP" },
    data: { status: "READ", readAt: new Date() },
  });
  return res.count > 0;
}

/** Mark all of a user's in-app notifications read. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { userId, channel: "IN_APP", status: { not: "READ" } },
    data: { status: "READ", readAt: new Date() },
  });
  return res.count;
}
