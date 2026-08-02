"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/server/services/audit.service";

export type ActionResult = { ok: boolean; message: string };

async function ownerShop() {
  const user = await requireRole("OWNER");
  if (!user.shopId) throw new Error("No shop for this account.");
  return { userId: user.id, shopId: user.shopId };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create a login for a barber the manager added, so the barber can sign in and
 * see their own appointments (/barber). The manager sets the initial password.
 */
export async function createBarberLoginAction(
  barberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, shopId } = await ownerShop();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber) return { ok: false, message: "Barber not found." };
  if (barber.userId) return { ok: false, message: "This barber already has a login." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, message: "That email is already in use." };

  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: barber.name, role: "BARBER", shopId, passwordHash },
    });
    await tx.barber.update({
      where: { id: barberId },
      data: { userId: user.id, email: barber.email ?? email },
    });
  });

  await logAudit({
    action: "barber.login_created",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: `Login created (${email})`,
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: `Login created. The barber signs in with ${email}.` };
}

/** Reset a barber's password (manager-initiated). */
export async function resetBarberPasswordAction(
  barberId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId, shopId } = await ownerShop();
  const barber = await prisma.barber.findFirst({ where: { id: barberId, shopId } });
  if (!barber || !barber.userId) return { ok: false, message: "This barber has no login yet." };

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, message: "Password must be at least 8 characters." };

  await prisma.user.update({
    where: { id: barber.userId },
    data: { passwordHash: await hashPassword(password) },
  });

  await logAudit({
    action: "barber.password_reset",
    shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Barber",
    entityId: barberId,
    description: "Barber password reset",
  });

  revalidatePath(`/dashboard/barbers/${barberId}`);
  return { ok: true, message: "Password updated." };
}
