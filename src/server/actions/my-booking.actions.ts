"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/server/services/audit.service";

export type ActionResult = { ok: boolean; message: string };

/**
 * Cancel one of the current customer's own bookings. Ownership is enforced by
 * matching the appointment's customer.userId to the signed-in user, so a
 * customer can never cancel someone else's appointment.
 */
export async function cancelMyBookingAction(appointmentId: string): Promise<ActionResult> {
  const user = await requireUser();

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, customer: { userId: user.id } },
    select: { id: true, shopId: true, status: true, startTime: true },
  });
  if (!appt) return { ok: false, message: "Booking not found." };

  if (!["PENDING", "CONFIRMED"].includes(appt.status)) {
    return { ok: false, message: "This booking can no longer be cancelled." };
  }
  if (appt.startTime.getTime() <= Date.now()) {
    return { ok: false, message: "Past bookings can't be cancelled." };
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledById: user.id,
      cancellationReason: "Cancelled by customer",
    },
  });

  await logAudit({
    action: "appointment.cancelled_by_customer",
    shopId: appt.shopId,
    actorId: user.id,
    actorRole: "CUSTOMER",
    entityType: "Appointment",
    entityId: appt.id,
    description: "Customer cancelled their booking",
  });

  revalidatePath("/account");
  return { ok: true, message: "Booking cancelled." };
}
