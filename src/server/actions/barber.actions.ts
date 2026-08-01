"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { resolveShopAccess } from "@/lib/subscription/policy";
import { barberSchema } from "@/lib/validations/barber";
import { logAudit } from "@/server/services/audit.service";

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | null;

async function ownerGate() {
  const user = await requireRole("OWNER");
  if (!user.shopId) throw new Error("No shop for this account.");
  const sub = await prisma.subscription.findUnique({ where: { shopId: user.shopId } });
  return { user, shopId: user.shopId, access: resolveShopAccess(sub) };
}

function parse(formData: FormData) {
  return barberSchema.safeParse({
    name: formData.get("name"),
    speciality: formData.get("speciality"),
    bio: formData.get("bio"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    photoUrl: formData.get("photoUrl"),
    status: formData.get("status") ?? "ACTIVE",
    isBookable: formData.get("isBookable") === "on" || formData.get("isBookable") === "true",
  });
}

export async function createBarberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { shopId, user, access } = await ownerGate();
  if (!access.canManageResources) {
    return { ok: false, message: "Your subscription doesn't allow adding barbers right now." };
  }
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const barber = await prisma.barber.create({
    data: {
      shopId,
      name: d.name,
      speciality: d.speciality || null,
      bio: d.bio || null,
      phone: d.phone || null,
      email: d.email || null,
      photoUrl: d.photoUrl || null,
      status: d.status,
      isBookable: d.isBookable,
    },
  });
  await logAudit({
    action: "barber.created",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barber.id,
    description: `Added barber "${d.name}"`,
  });

  revalidatePath("/dashboard/barbers");
  redirect(`/dashboard/barbers/${barber.id}`);
}

export async function updateBarberAction(
  barberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { shopId, user, access } = await ownerGate();
  if (!access.canManageResources) {
    return { ok: false, message: "Your subscription doesn't allow editing barbers right now." };
  }
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const res = await prisma.barber.updateMany({
    where: { id: barberId, shopId },
    data: {
      name: d.name,
      speciality: d.speciality || null,
      bio: d.bio || null,
      phone: d.phone || null,
      email: d.email || null,
      photoUrl: d.photoUrl || null,
      status: d.status,
      isBookable: d.isBookable,
    },
  });
  if (res.count === 0) return { ok: false, message: "Barber not found." };

  await logAudit({
    action: "barber.updated",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Updated barber "${d.name}"`,
  });

  revalidatePath("/dashboard/barbers");
  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: "Barber saved." };
}

export type ActionResult = { ok: boolean; message: string };

export async function toggleBookableAction(barberId: string): Promise<ActionResult> {
  const { shopId, user } = await ownerGate();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber) return { ok: false, message: "Barber not found." };

  await prisma.barber.update({
    where: { id: barberId },
    data: { isBookable: !barber.isBookable },
  });
  await logAudit({
    action: "barber.bookable_changed",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Bookable set ${!barber.isBookable}`,
  });
  revalidatePath("/dashboard/barbers");
  return { ok: true, message: barber.isBookable ? "Barber hidden from booking." : "Barber is now bookable." };
}

export async function deleteBarberAction(barberId: string): Promise<ActionResult> {
  const { shopId, user } = await ownerGate();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber) return { ok: false, message: "Barber not found." };

  try {
    await prisma.barber.delete({ where: { id: barberId } });
  } catch (error) {
    // Has appointments (Restrict) → deactivate instead of hard delete.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      await prisma.barber.update({
        where: { id: barberId },
        data: { status: "INACTIVE", isBookable: false },
      });
      return { ok: true, message: "Barber has bookings, so they were deactivated instead." };
    }
    throw error;
  }
  await logAudit({
    action: "barber.deleted",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Deleted barber "${barber.name}"`,
  });
  revalidatePath("/dashboard/barbers");
  return { ok: true, message: "Barber deleted." };
}
