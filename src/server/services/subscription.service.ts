import "server-only";

import type {
  PaymentProvider,
  Subscription,
  SubscriptionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import {
  evaluateLifecycle,
  REMINDER_COPY,
  type ReminderStage,
} from "@/lib/subscription/lifecycle";
import { logAudit } from "@/server/services/audit.service";
import { notify } from "@/server/services/notification.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Human-friendly, unique-ish receipt number. */
function receiptNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TB-${ymd}-${rand}`;
}

// =============================================================================
// Hourly checker
// =============================================================================

export type CheckSummary = {
  scanned: number;
  transitioned: number;
  remindersSent: number;
};

/**
 * The automatic subscription checker. Runs from the hourly cron. For every
 * non-terminal subscription it: transitions state by date, sends the due
 * renewal reminder, and records everything in the audit log.
 */
export async function runSubscriptionCheck(now = new Date()): Promise<CheckSummary> {
  const graceDays = env.billing.gracePeriodDays;

  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["TRIAL", "ACTIVE", "GRACE_PERIOD"] } },
    include: { shop: { select: { id: true, name: true, ownerId: true } } },
  });

  let transitioned = 0;
  let remindersSent = 0;

  for (const sub of subs) {
    const result = evaluateLifecycle(
      {
        status: sub.status,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        lastReminderStage: sub.lastReminderStage,
        lastReminderSentAt: sub.lastReminderSentAt,
      },
      now,
      graceDays,
    );

    const data: Record<string, unknown> = {};

    if (result.statusChanged) {
      data.status = result.nextStatus;
      data.gracePeriodEndsAt = result.gracePeriodEndsAt;
      transitioned += 1;
    }

    if (result.reminder) {
      data.lastReminderStage = result.reminder;
      data.lastReminderSentAt = now;
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.subscription.update({ where: { id: sub.id }, data });

    if (result.statusChanged) {
      await logAudit({
        action: `subscription.${result.nextStatus.toLowerCase()}`,
        shopId: sub.shopId,
        entityType: "Subscription",
        entityId: sub.id,
        description: `Auto transition ${sub.status} → ${result.nextStatus}`,
        metadata: { via: "cron" },
      });
    }

    if (result.reminder) {
      await sendReminder(sub.id, sub.shop.ownerId, sub.shopId, result.reminder, sub);
      remindersSent += 1;
    }
  }

  return { scanned: subs.length, transitioned, remindersSent };
}

async function sendReminder(
  subscriptionId: string,
  ownerId: string,
  shopId: string,
  stage: ReminderStage,
  sub: Subscription,
): Promise<void> {
  const daysLeft = sub.currentPeriodEnd
    ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / DAY_MS))
    : 0;

  await notify({
    type: stage === "grace" ? "SUBSCRIPTION_EXPIRED" : "SUBSCRIPTION_REMINDER",
    title: "Subscription renewal",
    body: REMINDER_COPY[stage],
    shopId,
    userId: ownerId,
    channels: ["IN_APP", "EMAIL", "SMS"],
    metadata: {
      stage,
      daysLeft,
      amountDue: sub.amount,
      expiresAt: sub.currentPeriodEnd?.toISOString() ?? null,
    },
  });

  await logAudit({
    action: "subscription.reminder_sent",
    shopId,
    entityType: "Subscription",
    entityId: subscriptionId,
    description: `Reminder "${stage}" sent to owner`,
  });
}

// =============================================================================
// Renewal / payment confirmation
// =============================================================================

export type RenewInput = {
  shopId: string;
  provider: PaymentProvider;
  amount?: number;
  providerRef?: string;
  actorId?: string | null;
};

export type RenewResult = {
  subscription: Subscription;
  receiptNumber: string;
  paymentId: string;
};

/**
 * Confirm a subscription payment. Idempotent-ish per call: records a SUCCESSFUL
 * Payment, flips status to ACTIVE, extends the period by one billing cycle from
 * whichever is later (now or the current end), clears grace, and notifies.
 *
 * No manual activation is required — calling this IS the activation.
 */
export async function renewSubscription(input: RenewInput): Promise<RenewResult> {
  const sub = await prisma.subscription.findUnique({
    where: { shopId: input.shopId },
    include: { shop: { select: { ownerId: true, name: true } } },
  });
  if (!sub) throw new Error(`No subscription for shop ${input.shopId}`);

  const now = new Date();
  const amount = input.amount ?? sub.amount;
  const anchor =
    sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime()
      ? sub.currentPeriodEnd
      : now;
  const newEnd = new Date(anchor.getTime() + sub.billingCycleDays * DAY_MS);
  const receipt = receiptNumber();

  const { updated, paymentId } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        shopId: input.shopId,
        type: "SUBSCRIPTION",
        subscriptionId: sub.id,
        amount,
        currency: sub.currency,
        provider: input.provider,
        providerRef: input.providerRef,
        status: "SUCCESSFUL",
        paidAt: now,
        receiptNumber: receipt,
      },
      select: { id: true },
    });

    const updated = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: newEnd,
        gracePeriodEndsAt: null,
        cancelledAt: null,
        dataRetentionUntil: null,
        lastReminderStage: null,
        lastReminderSentAt: null,
      },
    });

    return { updated, paymentId: payment.id };
  });

  await notify({
    type: "PAYMENT_RECEIPT",
    title: "Payment received",
    body: `We received ${sub.currency} ${amount.toLocaleString()}. Your subscription is active until ${newEnd.toDateString()}.`,
    shopId: input.shopId,
    userId: sub.shop.ownerId,
    channels: ["IN_APP", "EMAIL", "SMS"],
    metadata: { receiptNumber: receipt, amount, newEnd: newEnd.toISOString() },
  });

  await logAudit({
    action: "subscription.renewed",
    shopId: input.shopId,
    actorId: input.actorId ?? sub.shop.ownerId,
    entityType: "Subscription",
    entityId: sub.id,
    description: `Renewed via ${input.provider}; active until ${newEnd.toISOString()}`,
    metadata: { receiptNumber: receipt, amount },
  });

  return { subscription: updated, receiptNumber: receipt, paymentId };
}

// =============================================================================
// Super-admin actions
// =============================================================================

async function setStatus(
  shopId: string,
  status: SubscriptionStatus,
  action: string,
  actorId: string,
  extra: Record<string, unknown> = {},
): Promise<Subscription> {
  const updated = await prisma.subscription.update({
    where: { shopId },
    data: { status, ...extra },
  });
  await logAudit({
    action,
    shopId,
    actorId,
    actorRole: "SUPER_ADMIN",
    entityType: "Subscription",
    entityId: updated.id,
    description: `Status set to ${status} by super admin`,
  });
  return updated;
}

export function suspendSubscription(shopId: string, actorId: string) {
  return setStatus(shopId, "SUSPENDED", "subscription.suspended", actorId);
}

/** Manually mark ACTIVE without payment (e.g. offline settlement). */
export function activateSubscription(shopId: string, actorId: string) {
  return setStatus(shopId, "ACTIVE", "subscription.activated", actorId, {
    gracePeriodEndsAt: null,
    lastReminderStage: null,
  });
}

/** Extend the current period by N days (keeps current status if active-ish). */
export async function extendSubscription(
  shopId: string,
  days: number,
  actorId: string,
): Promise<Subscription> {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { shopId } });
  const anchor =
    sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > Date.now()
      ? sub.currentPeriodEnd
      : new Date();
  const newEnd = new Date(anchor.getTime() + days * DAY_MS);
  const updated = await prisma.subscription.update({
    where: { shopId },
    data: {
      currentPeriodEnd: newEnd,
      status: "ACTIVE",
      gracePeriodEndsAt: null,
      lastReminderStage: null,
    },
  });
  await logAudit({
    action: "subscription.extended",
    shopId,
    actorId,
    actorRole: "SUPER_ADMIN",
    entityType: "Subscription",
    entityId: updated.id,
    description: `Extended by ${days} days → ${newEnd.toISOString()}`,
  });
  return updated;
}

/** Grant a complimentary period of N days (also a form of extend). */
export function grantComplimentary(shopId: string, days: number, actorId: string) {
  return extendSubscription(shopId, days, actorId);
}

export async function cancelSubscription(
  shopId: string,
  actorId: string,
): Promise<Subscription> {
  const now = new Date();
  return setStatus(shopId, "CANCELLED", "subscription.cancelled", actorId, {
    cancelledAt: now,
    dataRetentionUntil: new Date(
      now.getTime() + env.billing.cancelledRetentionDays * DAY_MS,
    ),
  });
}
