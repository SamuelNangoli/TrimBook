import type { SubscriptionStatus } from "@prisma/client";

/**
 * Subscription lifecycle engine — PURE (no DB, no clock of its own).
 *
 * Given a subscription's dates + current status and a reference `now`, it
 * decides (a) the next status, and (b) which renewal reminder, if any, is due.
 * The hourly cron (src/server/services/subscription.service.ts) feeds rows in
 * and persists whatever this returns. Keeping it pure makes the billing rules
 * unit-testable and impossible to bypass from the client.
 */

export type ReminderStage = "7d" | "3d" | "1d" | "expiry" | "grace";

export type LifecycleInput = {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  lastReminderStage: string | null;
  lastReminderSentAt: Date | null;
};

export type LifecycleResult = {
  nextStatus: SubscriptionStatus;
  statusChanged: boolean;
  /** Set when the subscription transitions INTO the grace period. */
  gracePeriodEndsAt: Date | null;
  /** A reminder that should be sent right now (already de-duplicated). */
  reminder: ReminderStage | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `now` until `date` (positive = future, negative = past). */
function daysUntil(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Evaluate a subscription.
 *
 * @param graceDays length of the grace period (from env / the shop's plan).
 */
export function evaluateLifecycle(
  input: LifecycleInput,
  now: Date,
  graceDays: number,
): LifecycleResult {
  const base: LifecycleResult = {
    nextStatus: input.status,
    statusChanged: false,
    gracePeriodEndsAt: input.gracePeriodEndsAt,
    reminder: null,
  };

  // Terminal / admin-controlled states are never auto-transitioned here.
  if (
    input.status === "SUSPENDED" ||
    input.status === "EXPIRED" ||
    input.status === "CANCELLED"
  ) {
    return base;
  }

  const expiry = input.currentPeriodEnd ?? input.trialEndsAt;

  // --- State transitions -----------------------------------------------------
  if (input.status === "TRIAL" || input.status === "ACTIVE") {
    if (expiry && now.getTime() >= expiry.getTime()) {
      // Expired → enter grace period. Compute its end from the expiry date so a
      // late cron run doesn't extend the grace window.
      const graceEnd =
        input.gracePeriodEndsAt ??
        new Date(expiry.getTime() + graceDays * DAY_MS);

      if (now.getTime() >= graceEnd.getTime()) {
        // Grace already fully elapsed by the time we looked.
        return {
          nextStatus: "EXPIRED",
          statusChanged: true,
          gracePeriodEndsAt: graceEnd,
          reminder: null,
        };
      }

      return {
        nextStatus: "GRACE_PERIOD",
        statusChanged: true,
        gracePeriodEndsAt: graceEnd,
        reminder: dedupeReminder("grace", input),
      };
    }
  }

  if (input.status === "GRACE_PERIOD") {
    const graceEnd = input.gracePeriodEndsAt;
    if (graceEnd && now.getTime() >= graceEnd.getTime()) {
      return {
        nextStatus: "EXPIRED",
        statusChanged: true,
        gracePeriodEndsAt: graceEnd,
        reminder: null,
      };
    }
    // Still in grace: remind daily.
    return { ...base, reminder: dedupeReminder("grace", input) };
  }

  // --- Pre-expiry reminders (TRIAL / ACTIVE, not yet expired) ----------------
  if (expiry) {
    const d = daysUntil(expiry, now);
    let stage: ReminderStage | null = null;
    if (d <= 0) stage = "expiry";
    else if (d === 1) stage = "1d";
    else if (d <= 3) stage = "3d";
    else if (d <= 7) stage = "7d";

    if (stage) {
      return { ...base, reminder: dedupeReminder(stage, input) };
    }
  }

  return base;
}

/**
 * Return the stage only if it hasn't already been sent. Fixed-milestone stages
 * (7d/3d/1d/expiry) send once. The daily "grace" reminder sends at most once
 * per ~20h so an hourly cron doesn't spam.
 */
function dedupeReminder(
  stage: ReminderStage,
  input: LifecycleInput,
): ReminderStage | null {
  if (stage === "grace") {
    if (input.lastReminderStage !== "grace") return "grace";
    if (!input.lastReminderSentAt) return "grace";
    const hours = (Date.now() - input.lastReminderSentAt.getTime()) / (60 * 60 * 1000);
    return hours >= 20 ? "grace" : null;
  }
  return input.lastReminderStage === stage ? null : stage;
}

export const REMINDER_COPY: Record<ReminderStage, string> = {
  "7d": "Your TrimBook subscription expires in 7 days.",
  "3d": "Your TrimBook subscription expires in 3 days.",
  "1d": "Your TrimBook subscription expires tomorrow.",
  expiry: "Your TrimBook subscription expires today. Renew to avoid interruption.",
  grace: "Your subscription has expired. Renew now to restore full access.",
};
