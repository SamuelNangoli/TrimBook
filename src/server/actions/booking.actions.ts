"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireShopId } from "@/lib/dal";
import { getShopContext } from "@/lib/shop-context";
import { findOrCreateCustomer } from "@/server/services/customer.service";
import {
  getAvailableSlots,
  createAppointment,
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  markArrived,
  markCompleted,
  markNoShow,
  rescheduleAppointment,
  BookingConflictError,
  BookingClosedError,
} from "@/server/services/booking.service";

export type ActionResult = { ok: boolean; message: string };

// -----------------------------------------------------------------------------
// Slots (used by the new-booking client picker)
// -----------------------------------------------------------------------------

export type SlotDTO = { minutes: number; label: string; startISO: string };

export async function getSlotsAction(input: {
  barberId: string;
  serviceId: string;
  dateStr: string;
}): Promise<SlotDTO[]> {
  const { shopId } = await requireShopId();
  const slots = await getAvailableSlots({ shopId, ...input });
  return slots.map((s) => ({
    minutes: s.minutes,
    label: s.label,
    startISO: s.startUtc.toISOString(),
  }));
}

// -----------------------------------------------------------------------------
// Create (owner/staff walk-in booking)
// -----------------------------------------------------------------------------

export type CreateBookingState =
  | { ok: false; message: string }
  | null;

export async function createBookingAction(
  _prev: CreateBookingState,
  formData: FormData,
): Promise<CreateBookingState> {
  const ctx = await getShopContext();
  if (!ctx.access.canAcceptBookings) {
    return { ok: false, message: "New bookings are paused while your subscription is inactive." };
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "");
  const barberId = String(formData.get("barberId") ?? "");
  const startISO = String(formData.get("startISO") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName) return { ok: false, message: "Enter the customer's name." };
  if (!serviceId || !barberId) return { ok: false, message: "Choose a service and barber." };
  if (!startISO) return { ok: false, message: "Pick an available time slot." };

  try {
    const customer = await findOrCreateCustomer({
      shopId: ctx.shopId,
      name: customerName,
      phone: customerPhone || null,
    });

    await createAppointment({
      shopId: ctx.shopId,
      barberId,
      serviceId,
      customerId: customer.id,
      startUtc: new Date(startISO),
      notes: notes || null,
      status: "CONFIRMED", // staff-created bookings are confirmed immediately
      actorUserId: ctx.userId,
    });
  } catch (error) {
    if (error instanceof BookingConflictError || error instanceof BookingClosedError) {
      return { ok: false, message: error.message };
    }
    console.error("[booking] create failed", error);
    return { ok: false, message: "Couldn't create the booking. Try again." };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
  redirect("/dashboard/bookings");
}

// -----------------------------------------------------------------------------
// Status transitions
// -----------------------------------------------------------------------------

async function staff() {
  const { user, shopId } = await requireShopId();
  return { userId: user.id, shopId };
}

function refresh() {
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

export async function confirmBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await confirmAppointment(shopId, id, userId);
  refresh();
  return { ok: true, message: "Booking confirmed." };
}

export async function rejectBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await rejectAppointment(shopId, id, userId);
  refresh();
  return { ok: true, message: "Booking declined." };
}

export async function cancelBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await cancelAppointment(shopId, id, userId);
  refresh();
  return { ok: true, message: "Booking cancelled." };
}

export async function arrivedBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await markArrived(shopId, id, userId);
  refresh();
  return { ok: true, message: "Marked as arrived." };
}

export async function completeBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await markCompleted(shopId, id, userId);
  refresh();
  return { ok: true, message: "Marked as completed." };
}

export async function noShowBookingAction(id: string): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  await markNoShow(shopId, id, userId);
  refresh();
  return { ok: true, message: "Marked as no-show." };
}

export async function rescheduleBookingAction(
  id: string,
  startISO: string,
): Promise<ActionResult> {
  const { userId, shopId } = await staff();
  try {
    await rescheduleAppointment(shopId, id, new Date(startISO), userId);
  } catch (error) {
    if (error instanceof BookingConflictError) return { ok: false, message: error.message };
    throw error;
  }
  refresh();
  return { ok: true, message: "Booking rescheduled." };
}
