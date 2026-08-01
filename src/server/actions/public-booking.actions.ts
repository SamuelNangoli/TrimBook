"use server";

import { redirect } from "next/navigation";

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

export type BookState = { ok: false; message: string } | null;

export async function bookAppointmentAction(
  _prev: BookState,
  formData: FormData,
): Promise<BookState> {
  const user = await getCurrentUser();
  const slug = String(formData.get("slug") ?? "");

  if (!user) {
    // Not signed in — send them to login and back to this booking page.
    redirect(`/login?callbackUrl=/shops/${slug}/book`);
  }

  const shop = await resolveBookableShop(slug);
  if (!shop) return { ok: false, message: "This shop could not be found." };
  if (!shop.bookable) {
    return { ok: false, message: "This barbershop is temporarily unavailable." };
  }

  const serviceId = String(formData.get("serviceId") ?? "");
  const barberId = String(formData.get("barberId") ?? "");
  const startISO = String(formData.get("startISO") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!serviceId || !barberId) return { ok: false, message: "Choose a service and barber." };
  if (!startISO) return { ok: false, message: "Pick an available time slot." };

  try {
    const customer = await findOrCreateCustomer({
      shopId: shop.id,
      name: user.name ?? user.email ?? "Customer",
      phone: phone || null,
      email: user.email ?? null,
      userId: user.id,
    });

    await createAppointment({
      shopId: shop.id,
      barberId,
      serviceId,
      customerId: customer.id,
      startUtc: new Date(startISO),
      notes: notes || null,
      status: "PENDING", // customer bookings await shop confirmation
      actorUserId: user.id,
    });
  } catch (error) {
    if (error instanceof BookingConflictError || error instanceof BookingClosedError) {
      return { ok: false, message: error.message };
    }
    console.error("[public-booking] failed", error);
    return { ok: false, message: "Couldn't complete your booking. Please try again." };
  }

  redirect("/account?booked=1");
}
