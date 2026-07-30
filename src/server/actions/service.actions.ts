"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { resolveShopAccess } from "@/lib/subscription/policy";
import { serviceSchema } from "@/lib/validations/service";
import { logAudit } from "@/server/services/audit.service";

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | null;

/** Owner-only gate that also enforces the subscription can manage resources. */
async function ownerGate() {
  const user = await requireRole("OWNER");
  if (!user.shopId) throw new Error("No shop for this account.");
  const sub = await prisma.subscription.findUnique({ where: { shopId: user.shopId } });
  const access = resolveShopAccess(sub);
  return { user, shopId: user.shopId, access };
}

function parse(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes"),
    category: formData.get("category"),
    status: formData.get("status") ?? "ACTIVE",
  });
}

export async function createServiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { shopId, user, access } = await ownerGate();
  if (!access.canManageResources) {
    return { ok: false, message: "Your subscription doesn't allow adding services right now." };
  }

  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const service = await prisma.service.create({
    data: {
      shopId,
      name: d.name,
      description: d.description || null,
      price: d.price,
      durationMinutes: d.durationMinutes,
      category: d.category || null,
      status: d.status,
    },
  });
  await logAudit({
    action: "service.created",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Service",
    entityId: service.id,
    description: `Created service "${d.name}"`,
  });

  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export async function updateServiceAction(
  serviceId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { shopId, user, access } = await ownerGate();
  if (!access.canManageResources) {
    return { ok: false, message: "Your subscription doesn't allow editing services right now." };
  }

  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  // updateMany with shopId guarantees tenant isolation.
  const res = await prisma.service.updateMany({
    where: { id: serviceId, shopId },
    data: {
      name: d.name,
      description: d.description || null,
      price: d.price,
      durationMinutes: d.durationMinutes,
      category: d.category || null,
      status: d.status,
    },
  });
  if (res.count === 0) return { ok: false, message: "Service not found." };

  await logAudit({
    action: "service.updated",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Service",
    entityId: serviceId,
    description: `Updated service "${d.name}"`,
  });

  revalidatePath("/dashboard/services");
  redirect("/dashboard/services");
}

export type ActionResult = { ok: boolean; message: string };

export async function toggleServiceAction(serviceId: string): Promise<ActionResult> {
  const { shopId, user } = await ownerGate();
  const service = await prisma.service.findFirst({ where: { id: serviceId, shopId } });
  if (!service) return { ok: false, message: "Service not found." };

  const next = service.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  await prisma.service.update({ where: { id: serviceId }, data: { status: next } });
  await logAudit({
    action: "service.status_changed",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Service",
    entityId: serviceId,
    description: `Service set ${next}`,
  });
  revalidatePath("/dashboard/services");
  return { ok: true, message: next === "ACTIVE" ? "Service activated." : "Service deactivated." };
}

export async function deleteServiceAction(serviceId: string): Promise<ActionResult> {
  const { shopId, user } = await ownerGate();
  const service = await prisma.service.findFirst({ where: { id: serviceId, shopId } });
  if (!service) return { ok: false, message: "Service not found." };

  try {
    await prisma.service.delete({ where: { id: serviceId } });
  } catch (error) {
    // Restrict FK: the service has bookings and can't be hard-deleted.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      await prisma.service.update({ where: { id: serviceId }, data: { status: "INACTIVE" } });
      return {
        ok: true,
        message: "Service has bookings, so it was deactivated instead of deleted.",
      };
    }
    throw error;
  }
  await logAudit({
    action: "service.deleted",
    shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Service",
    entityId: serviceId,
    description: `Deleted service "${service.name}"`,
  });
  revalidatePath("/dashboard/services");
  return { ok: true, message: "Service deleted." };
}
