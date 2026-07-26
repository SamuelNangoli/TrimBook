import "server-only";

import type { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/dal";

/**
 * Tenant context — the single object every server-side operation uses to know
 * which shop it may touch.
 *
 * Rules:
 *  - OWNER / BARBER: `shopId` is their own shop. They can only ever act within it.
 *  - SUPER_ADMIN:    `shopId` is null but `canCrossTenant` is true — platform
 *                    operations may target any shop, explicitly.
 *  - CUSTOMER:       `shopId` is null; customers act on their own bookings across
 *                    many shops (scoped by userId, not shopId).
 */
export type TenantContext = {
  userId: string;
  role: Role;
  /** The acting shop for staff; null for super admin / customer. */
  shopId: string | null;
  /** Only the super admin may operate across tenant boundaries. */
  canCrossTenant: boolean;
};

export class TenantAccessError extends Error {
  constructor(message = "Cross-tenant access denied") {
    super(message);
    this.name = "TenantAccessError";
  }
}

/** Build the tenant context from the current session, or null if signed out. */
export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    userId: user.id,
    role: user.role,
    shopId: user.shopId,
    canCrossTenant: user.role === "SUPER_ADMIN",
  };
}

/**
 * Assert that `resourceShopId` is reachable by this context. Super admins pass
 * for any shop; staff pass only for their own. Throws otherwise.
 *
 * This is the last line of defense: call it before returning or mutating any
 * row that carries a shopId, using the row's actual shopId from the database.
 */
export function assertShopAccess(
  ctx: TenantContext,
  resourceShopId: string,
): void {
  if (ctx.canCrossTenant) return;
  if (ctx.shopId && ctx.shopId === resourceShopId) return;
  throw new TenantAccessError(
    `User ${ctx.userId} attempted to access shop ${resourceShopId}`,
  );
}

/**
 * Resolve the shopId a query must be scoped to. For staff this is always their
 * own shop regardless of any client-supplied value (prevents tampering). Super
 * admins may pass an explicit target shopId.
 */
export function resolveScopeShopId(
  ctx: TenantContext,
  requestedShopId?: string,
): string {
  if (ctx.canCrossTenant) {
    if (!requestedShopId) {
      throw new TenantAccessError("Super admin must specify a target shopId");
    }
    return requestedShopId;
  }
  if (!ctx.shopId) {
    throw new TenantAccessError("No shop bound to this user");
  }
  // Ignore any requestedShopId from staff — they are locked to their own shop.
  return ctx.shopId;
}
