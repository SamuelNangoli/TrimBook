import "server-only";

import type { Appointment, AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveShopAccess } from "@/lib/subscription/policy";
import { logAudit } from "@/server/services/audit.service";
import { notify } from "@/server/services/notification.service";
import {
  dayOfWeek,
  generateSlotStarts,
  localDayStartUtc,
  localMinutesToUtc,
  minutesToLabel,
  toLocalMinutes,
  type Window,
} from "@/lib/booking/scheduling";

const DAY = 24 * 60;
const DEFAULT_OPEN: Window = { start: 540, end: 1080 }; // 09:00–18:00
const SLOT_STEP = 15;

/** Statuses that occupy a barber's time and therefore block new bookings. */
const BLOCKING: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

export class BookingConflictError extends Error {
  constructor() {
    super("That time is no longer available. Please pick another slot.");
    this.name = "BookingConflictError";
  }
}
export class BookingClosedError extends Error {
  constructor() {
    super("This shop isn't accepting new bookings right now.");
    this.name = "BookingClosedError";
  }
}
export class BookingNotFoundError extends Error {
  constructor() {
    super("Appointment not found.");
    this.name = "BookingNotFoundError";
  }
}

export type Slot = { startUtc: Date; minutes: number; label: string };

// =============================================================================
// Availability
// =============================================================================

/**
 * Compute bookable start times for a barber + service on a given local date.
 * Combines the barber's (or shop-default) weekly hours, one-off availability
 * exceptions, and existing appointments, minus already-elapsed time for today.
 */
export async function getAvailableSlots(input: {
  shopId: string;
  barberId: string;
  serviceId: string;
  dateStr: string; // YYYY-MM-DD in the shop's timezone
}): Promise<Slot[]> {
  const [service, barber, shop] = await Promise.all([
    prisma.service.findFirst({
      where: { id: input.serviceId, shopId: input.shopId, status: "ACTIVE" },
      select: { durationMinutes: true },
    }),
    prisma.barber.findFirst({
      where: { id: input.barberId, shopId: input.shopId, status: "ACTIVE", isBookable: true },
      select: { id: true },
    }),
    prisma.shop.findUnique({
      where: { id: input.shopId },
      select: { timezone: true },
    }),
  ]);

  if (!service || !barber || !shop) return [];

  const tz = shop.timezone;
  const dayStart = localDayStartUtc(input.dateStr, tz);
  const dayEnd = new Date(dayStart.getTime() + DAY * 60000);
  const dow = dayOfWeek(input.dateStr);

  // Weekly hours: prefer barber-specific, then shop default, then 09:00–18:00.
  const hours = await prisma.workingHours.findMany({
    where: {
      shopId: input.shopId,
      dayOfWeek: dow,
      OR: [{ barberId: input.barberId }, { barberId: null }],
    },
  });
  const barberHours = hours.find((h) => h.barberId === input.barberId);
  const shopHours = hours.find((h) => h.barberId === null);
  const effective = barberHours ?? shopHours;

  let open: Window[] = [];
  if (effective) {
    if (!effective.isClosed) open = [{ start: effective.startMinutes, end: effective.endMinutes }];
  } else {
    open = [DEFAULT_OPEN];
  }

  // One-off exceptions + existing appointments in the day.
  const [exceptions, appointments] = await Promise.all([
    prisma.availability.findMany({
      where: {
        shopId: input.shopId,
        barberId: input.barberId,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
    }),
    prisma.appointment.findMany({
      where: {
        shopId: input.shopId,
        barberId: input.barberId,
        status: { in: BLOCKING },
        startTime: { lt: dayEnd, gte: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const busy: Window[] = [];
  for (const ex of exceptions) {
    const w = clampWindow(ex.startTime, ex.endTime, dayStart);
    if (ex.type === "EXTRA") open.push(w);
    else busy.push(w); // LEAVE / BLOCK
  }
  for (const appt of appointments) {
    busy.push(clampWindow(appt.startTime, appt.endTime, dayStart));
  }

  // Don't offer slots in the past for today.
  const now = new Date();
  let earliestStart = 0;
  if (now >= dayStart && now < dayEnd) {
    earliestStart = Math.max(0, toLocalMinutes(now, dayStart));
  }

  const starts = generateSlotStarts({
    open,
    busy,
    durationMinutes: service.durationMinutes,
    stepMinutes: SLOT_STEP,
    earliestStart,
  });

  return starts.map((m) => ({
    minutes: m,
    label: minutesToLabel(m),
    startUtc: localMinutesToUtc(dayStart, m),
  }));
}

function clampWindow(start: Date, end: Date, dayStart: Date): Window {
  const s = Math.max(0, toLocalMinutes(start, dayStart));
  const e = Math.min(DAY, toLocalMinutes(end, dayStart));
  return { start: s, end: e };
}

// =============================================================================
// Create
// =============================================================================

export async function createAppointment(input: {
  shopId: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  startUtc: Date;
  notes?: string | null;
  status?: Extract<AppointmentStatus, "PENDING" | "CONFIRMED">;
  actorUserId?: string | null;
}): Promise<Appointment> {
  // Subscription gate — enforced here so it can't be bypassed (public bookings).
  const sub = await prisma.subscription.findUnique({ where: { shopId: input.shopId } });
  if (!resolveShopAccess(sub).canAcceptBookings) throw new BookingClosedError();

  const [service, barber] = await Promise.all([
    prisma.service.findFirst({
      where: { id: input.serviceId, shopId: input.shopId, status: "ACTIVE" },
    }),
    prisma.barber.findFirst({
      where: { id: input.barberId, shopId: input.shopId, status: "ACTIVE", isBookable: true },
    }),
  ]);
  if (!service) throw new Error("Service not available.");
  if (!barber) throw new Error("Barber not available.");

  const endUtc = new Date(input.startUtc.getTime() + service.durationMinutes * 60000);
  const status = input.status ?? "PENDING";

  // Conflict-check + create atomically so two requests can't grab one slot.
  const appointment = await prisma.$transaction(async (tx) => {
    const clash = await tx.appointment.findFirst({
      where: {
        shopId: input.shopId,
        barberId: input.barberId,
        status: { in: BLOCKING },
        startTime: { lt: endUtc },
        endTime: { gt: input.startUtc },
      },
      select: { id: true },
    });
    if (clash) throw new BookingConflictError();

    const created = await tx.appointment.create({
      data: {
        shopId: input.shopId,
        customerId: input.customerId,
        barberId: input.barberId,
        serviceId: input.serviceId,
        status,
        startTime: input.startUtc,
        endTime: endUtc,
        durationMinutes: service.durationMinutes,
        priceAtBooking: service.price,
        currency: service.currency,
        notes: input.notes ?? null,
        confirmedAt: status === "CONFIRMED" ? new Date() : null,
      },
    });

    await tx.customer.update({
      where: { id: input.customerId },
      data: { totalBookings: { increment: 1 }, lastVisitAt: input.startUtc },
    });

    return created;
  });

  await notifyCustomer(appointment.customerId, input.shopId, {
    type: "BOOKING_CONFIRMATION",
    title: "Booking received",
    body: `Your ${service.name} is booked for ${input.startUtc.toUTCString()}.`,
    relatedAppointmentId: appointment.id,
  });

  await logAudit({
    action: "appointment.created",
    shopId: input.shopId,
    actorId: input.actorUserId ?? undefined,
    entityType: "Appointment",
    entityId: appointment.id,
    description: `Booked ${service.name} with ${barber.name}`,
  });

  return appointment;
}

// =============================================================================
// Status transitions (all tenant-scoped by shopId)
// =============================================================================

async function loadOwned(shopId: string, id: string) {
  const appt = await prisma.appointment.findFirst({ where: { id, shopId } });
  if (!appt) throw new BookingNotFoundError();
  return appt;
}

export async function confirmAppointment(shopId: string, id: string, actorId: string) {
  await loadOwned(shopId, id);
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  await notifyCustomer(updated.customerId, shopId, {
    type: "BOOKING_CONFIRMATION",
    title: "Booking confirmed",
    body: "Your appointment has been confirmed. See you soon!",
    relatedAppointmentId: id,
  });
  await audit(shopId, id, actorId, "appointment.confirmed", "Confirmed by shop");
  return updated;
}

export async function rejectAppointment(
  shopId: string,
  id: string,
  actorId: string,
  reason?: string,
) {
  await loadOwned(shopId, id);
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? "Declined by shop",
      cancelledById: actorId,
    },
  });
  await notifyCustomer(updated.customerId, shopId, {
    type: "BOOKING_CANCELLED",
    title: "Booking declined",
    body: reason ? `Your booking was declined: ${reason}` : "Your booking was declined.",
    relatedAppointmentId: id,
  });
  await audit(shopId, id, actorId, "appointment.rejected", reason ?? "Declined");
  return updated;
}

export async function cancelAppointment(
  shopId: string,
  id: string,
  actorId: string,
  reason?: string,
) {
  await loadOwned(shopId, id);
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? "Cancelled",
      cancelledById: actorId,
    },
  });
  await audit(shopId, id, actorId, "appointment.cancelled", reason ?? "Cancelled");
  return updated;
}

export async function markArrived(shopId: string, id: string, actorId: string) {
  await loadOwned(shopId, id);
  const updated = await prisma.appointment.update({
    where: { id },
    data: { customerArrived: true },
  });
  await audit(shopId, id, actorId, "appointment.arrived", "Customer arrived");
  return updated;
}

export async function markCompleted(shopId: string, id: string, actorId: string) {
  const appt = await loadOwned(shopId, id);
  const updated = await prisma.$transaction(async (tx) => {
    const done = await tx.appointment.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date(), customerArrived: true },
    });
    await tx.customer.update({
      where: { id: appt.customerId },
      data: { totalSpent: { increment: appt.priceAtBooking }, lastVisitAt: new Date() },
    });
    return done;
  });
  await audit(shopId, id, actorId, "appointment.completed", "Marked completed");
  return updated;
}

export async function markNoShow(shopId: string, id: string, actorId: string) {
  await loadOwned(shopId, id);
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: "NO_SHOW" },
  });
  await audit(shopId, id, actorId, "appointment.no_show", "Marked no-show");
  return updated;
}

/**
 * Reschedule: create a new appointment linked to the old one, and mark the old
 * one RESCHEDULED. Conflict-checked against the new time.
 */
export async function rescheduleAppointment(
  shopId: string,
  id: string,
  newStartUtc: Date,
  actorId: string,
): Promise<Appointment> {
  const appt = await loadOwned(shopId, id);
  const endUtc = new Date(newStartUtc.getTime() + appt.durationMinutes * 60000);

  const created = await prisma.$transaction(async (tx) => {
    const clash = await tx.appointment.findFirst({
      where: {
        shopId,
        barberId: appt.barberId,
        status: { in: BLOCKING },
        id: { not: id },
        startTime: { lt: endUtc },
        endTime: { gt: newStartUtc },
      },
      select: { id: true },
    });
    if (clash) throw new BookingConflictError();

    await tx.appointment.update({ where: { id }, data: { status: "RESCHEDULED" } });

    return tx.appointment.create({
      data: {
        shopId,
        customerId: appt.customerId,
        barberId: appt.barberId,
        serviceId: appt.serviceId,
        status: "CONFIRMED",
        startTime: newStartUtc,
        endTime: endUtc,
        durationMinutes: appt.durationMinutes,
        priceAtBooking: appt.priceAtBooking,
        currency: appt.currency,
        notes: appt.notes,
        rescheduledFromId: id,
        confirmedAt: new Date(),
      },
    });
  });

  await notifyCustomer(appt.customerId, shopId, {
    type: "BOOKING_RESCHEDULED",
    title: "Booking rescheduled",
    body: `Your appointment was moved to ${newStartUtc.toUTCString()}.`,
    relatedAppointmentId: created.id,
  });
  await audit(shopId, created.id, actorId, "appointment.rescheduled", "Rescheduled");
  return created;
}

// =============================================================================
// Appointment reminders (24h / 2h before) — run hourly from cron
// =============================================================================

export type ReminderSummary = { sent24: number; sent2: number };

export async function runAppointmentReminders(now = new Date()): Promise<ReminderSummary> {
  const in24 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in2 = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const include = {
    customer: { select: { id: true, userId: true } },
    service: { select: { name: true } },
    shop: { select: { name: true, timezone: true } },
  } as const;

  const due24 = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gt: now, lte: in24 },
      reminder24SentAt: null,
    },
    include,
  });
  for (const a of due24) {
    await sendApptReminder(a, "24h");
    await prisma.appointment.update({ where: { id: a.id }, data: { reminder24SentAt: now } });
  }

  const due2 = await prisma.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { gt: now, lte: in2 },
      reminder2SentAt: null,
    },
    include,
  });
  for (const a of due2) {
    await sendApptReminder(a, "2h");
    await prisma.appointment.update({ where: { id: a.id }, data: { reminder2SentAt: now } });
  }

  return { sent24: due24.length, sent2: due2.length };
}

async function sendApptReminder(
  appt: {
    id: string;
    startTime: Date;
    shopId: string;
    customer: { id: string; userId: string | null };
    service: { name: string };
    shop: { name: string; timezone: string };
  },
  stage: "24h" | "2h",
): Promise<void> {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: appt.shop.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(appt.startTime);

  await notify({
    type: stage === "24h" ? "BOOKING_REMINDER_24H" : "BOOKING_REMINDER_2H",
    title: stage === "24h" ? "Appointment tomorrow" : "Appointment soon",
    body: `Reminder: your ${appt.service.name} at ${appt.shop.name} is on ${when}.`,
    shopId: appt.shopId,
    customerId: appt.customer.id,
    userId: appt.customer.userId,
    channels: ["IN_APP", "SMS"],
    relatedAppointmentId: appt.id,
  });
}

// =============================================================================
// helpers
// =============================================================================

async function notifyCustomer(
  customerId: string,
  shopId: string,
  n: { type: Parameters<typeof notify>[0]["type"]; title: string; body: string; relatedAppointmentId?: string },
) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { userId: true },
  });
  await notify({
    type: n.type,
    title: n.title,
    body: n.body,
    shopId,
    customerId,
    userId: customer?.userId ?? null,
    relatedAppointmentId: n.relatedAppointmentId,
    channels: ["IN_APP", "SMS"],
  });
}

function audit(
  shopId: string,
  entityId: string,
  actorId: string,
  action: string,
  description: string,
) {
  return logAudit({
    action,
    shopId,
    actorId,
    entityType: "Appointment",
    entityId,
    description,
  });
}
