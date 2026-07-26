"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { shopProfileSchema } from "@/lib/validations/shop";
import { logAudit } from "@/server/services/audit.service";

export type FormState =
  | { ok: true; message?: string }
  | { ok: false; message?: string; fieldErrors?: Record<string, string[]> }
  | null;

/** Update the owner's shop profile (owner-only, scoped to their shop). */
export async function updateShopAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireRole("OWNER");
  if (!user.shopId) return { ok: false, message: "No shop found." };

  const parsed = shopProfileSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    city: formData.get("city"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  // updateMany with shopId guarantees we only ever touch this owner's shop.
  await prisma.shop.updateMany({
    where: { id: user.shopId, ownerId: user.id },
    data: {
      name: data.name,
      description: data.description || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city,
    },
  });

  await logAudit({
    action: "shop.profile_updated",
    shopId: user.shopId,
    actorId: user.id,
    actorRole: "OWNER",
    entityType: "Shop",
    entityId: user.shopId,
    description: "Shop profile updated",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Shop profile saved." };
}
