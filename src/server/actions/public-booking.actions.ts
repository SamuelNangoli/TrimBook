"use server";

import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { resolveShopAccess } from "@/lib/subscription/policy";
import { findOrCreateCustomer } from "@/server/services/customer.service";
import {
  getAvailableSlots,
  createAppointment,
  BookingConflictError,
  BookingClosedError,
} from "@/server/services/booking.service";

export type SlotDTO = { minutes: number; label: string; startISO: string };

/** Resolve a shop by slug and whether it currently accepts public bookings. */
async function resolveBookableShop(slug: string) {
  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: { subscription: { select: { status: true } } },
  });
  if (!shop || shop.status !== "ACTIVE") return null;
  const access = resolveShopAccess(shop.subscription);
  return { id: shop.id, bookable: access.publicBookable };
}

export async function getPublicSlotsAction(input: {
  slug: string;
  barberId: string;
  serviceId: string;
  dateStr: string;
}): Promise<SlotDTO[]> {
  const shop = await resolveBookableShop(input.slug);
  if (!shop || !shop.bookable) return [];
  const slots = await getAvailableSlots({
    shopId: shop.id,
    barberId: input.barberId,
    serviceId: input.serviceId,
    dateStr: input.dateStr,
  });
  return slots.map((s) => ({ minutes: s.minutes, label: s.label, startISO: s.startUtc.toISOString() }));
}

export type BookState =
  | { ok: true; loggedIn: boolean; when: string }
  | { ok: false; message: string }
  | null;

/**
 * Book an appointment. Works for both signed-in customers and guests — a guest
 * just provides their name and phone so the shop can reach them. Either way a
 * per-shop Customer record is found/created and a PENDING appointment is made.
 */
export async function bookAppointmentAction(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "");

  const shop = await resolveBookableShop(slug);
  if (!shop) return { ok: false, message: "This shop could not be found." };
  if (!shop.bookable) {
    return { ok: false, message: "This barbershop is temporarily unavailable." };
  }

  const serviceId = String(formData.get("serviceId") ?? "");
  const barberId = String(formData.get("barberId") ?? "");
  const startISO = String(formData.get("startISO") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestPhone = String(formData.get("guestPhone") ?? "").trim();

  if (!serviceId || !barberId) return { ok: false, message: "Choose a service and barber." };
  if (!startISO) return { ok: false, message: "Pick an available time slot." };

  // Resolve who is booking.
  let name: string;
  let phone: string | null;
  let email: string | null;
  let userId: string | null;

  if (user) {
    name = user.name ?? user.email ?? "Customer";
    email = user.email ?? null;
    userId = user.id;
    phone = guestPhone || null;
  } else {
    if (!guestName) return { ok: false, message: "Enter your name." };
    if (!guestPhone) return { ok: false, message: "Enter a phone number so the shop can reach you." };
    name = guestName;
    phone = guestPhone;
    email = null;
    userId = null;
  }

  try {
    const customer = await findOrCreateCustomer({ shopId: shop.id, name, phone, email, userId });

    const appt = await createAppointment({
      shopId: shop.id,
      barberId,
      serviceId,
      customerId: customer.id,
      startUtc: new Date(startISO),
      notes: notes || null,
      status: "PENDING", // customer bookings await shop confirmation
      actorUserId: userId,
    });

    return { ok: true, loggedIn: !!user, when: appt.startTime.toISOString() };
  } catch (error) {
    if (error instanceof BookingConflictError || error instanceof BookingClosedError) {
      return { ok: false, message: error.message };
    }
    console.error("[public-booking] failed", error);
    return { ok: false, message: "Couldn't complete your booking. Please try again." };
  }
}
