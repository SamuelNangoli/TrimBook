"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/server/services/audit.service";

export type ActionResult = { ok: boolean; message: string };

async function ownerShop() {
  const user = await requireRole("OWNER");
  if (!user.shopId) throw new Error("No shop for this account.");
  return { userId: user.id, shopId: user.shopId };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Give a barber access by creating a passwordless BARBER account tied to their
 * email. The barber then signs in with Google or an email magic link using that
 * address and sees their appointments at /barber. No password is set.
 */
export async function createBarberLoginAction(
  barberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, shopId } = await ownerShop();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber) return { ok: false, message: "Barber not found." };
  if (barber.userId) return { ok: false, message: "This barber already has access." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return {
      ok: false,
      message: "That email already has an account. Use a different email for the barber.",
    };
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: barber.name, role: "BARBER", shopId },
    });
    await tx.barber.update({
      where: { id: barberId },
      data: { userId: user.id, email: barber.email ?? email },
    });
  });

  await logAudit({
    action: "barber.access_granted",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Access invited (${email})`,
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: `Access granted. ${barber.name} signs in with ${email}.` };
}

/** Revoke a barber's login (unlinks their account; keeps the barber record). */
export async function revokeBarberLoginAction(barberId: string): Promise<ActionResult> {
  const { userId, shopId } = await ownerShop();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber || !barber.userId) return { ok: false, message: "This barber has no login." };

  const linkedUserId = barber.userId;
  await prisma.$transaction(async (tx) => {
    await tx.barber.update({ where: { id: barberId }, data: { userId: null } });
    // Remove the login account entirely so they can no longer sign in.
    await tx.user.deleteMany({ where: { id: linkedUserId, role: "BARBER" } });
  });

  await logAudit({
    action: "barber.access_revoked",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: "Barber access revoked",
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: "Access revoked." };
}
