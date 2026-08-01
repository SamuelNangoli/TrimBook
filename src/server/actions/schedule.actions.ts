"use server";

import { revalidatePath } from "next/cache";
import type { AvailabilityType, DayOfWeek } from "@prisma/client";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { localDateTimeToUtc } from "@/lib/booking/scheduling";
import { logAudit } from "@/server/services/audit.service";

export type ActionResult = { ok: boolean; message: string };

const DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

async function owner() {
  const user = await requireRole("OWNER");
  if (!user.shopId) throw new Error("No shop for this account.");
  return { userId: user.id, shopId: user.shopId };
}

function hhmmToMinutes(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return Math.min(24 * 60, Math.max(0, h * 60 + m));
}

/** Ensure the barber belongs to the owner's shop. */
async function assertBarber(shopId: string, barberId: string) {
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber) throw new Error("Barber not found.");
  return barber;
}

/**
 * Replace a barber's weekly working hours in one shot. Fields per day:
 * `open_<DAY>` (checkbox), `start_<DAY>` and `end_<DAY>` as HH:MM.
 */
export async function saveWorkingHoursAction(
  barberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { shopId, userId } = await owner();
  await assertBarber(shopId, barberId);

  const rows = DAYS.map((day) => {
    const isOpen = formData.get(`open_${day}`) === "on" || formData.get(`open_${day}`) === "true";
    const start = hhmmToMinutes(formData.get(`start_${day}`) as string | null, 540);
    const end = hhmmToMinutes(formData.get(`end_${day}`) as string | null, 1080);
    return {
      shopId,
      barberId,
      dayOfWeek: day,
      isClosed: !isOpen,
      startMinutes: start,
      endMinutes: end > start ? end : start + 60,
    };
  });

  await prisma.$transaction([
    prisma.workingHours.deleteMany({ where: { shopId, barberId } }),
    prisma.workingHours.createMany({ data: rows }),
  ]);

  await logAudit({
    action: "barber.hours_updated",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: "Working hours updated",
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: "Working hours saved." };
}

export async function addAvailabilityAction(
  barberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { shopId, userId } = await owner();
  await assertBarber(shopId, barberId);

  const type = String(formData.get("type") ?? "LEAVE") as AvailabilityType;
  const startRaw = String(formData.get("start") ?? "");
  const endRaw = String(formData.get("end") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startRaw || !endRaw) return { ok: false, message: "Enter a start and end time." };

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: { timezone: true },
  });
  const start = localDateTimeToUtc(startRaw, shop.timezone);
  const end = localDateTimeToUtc(endRaw, shop.timezone);
  if (end <= start) return { ok: false, message: "End must be after start." };

  await prisma.availability.create({
    data: { shopId, barberId, type, startTime: start, endTime: end, reason: reason || null },
  });
  await logAudit({
    action: "barber.availability_added",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Added ${type} ${startRaw} → ${endRaw}`,
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: "Availability exception added." };
}

export async function deleteAvailabilityAction(id: string): Promise<ActionResult> {
  const { shopId } = await owner();
  const res = await prisma.availability.deleteMany({ where: { id, shopId } });
  if (res.count === 0) return { ok: false, message: "Not found." };
  revalidatePath("/dashboard/barbers");
  return { ok: true, message: "Removed." };
}
