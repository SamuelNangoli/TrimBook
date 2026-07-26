import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Shop, Subscription } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireShopId } from "@/lib/dal";
import { resolveShopAccess, type ShopAccess } from "@/lib/subscription/policy";

/**
 * The current staff user's shop + subscription + resolved feature access.
 *
 * This is the single place dashboard code learns "what can this shop do right
 * now?". Access is derived from the subscription via the pure policy — so the
 * cron (which moves statuses) and the UI/guards always agree.
 */
export type ShopContext = {
  userId: string;
  userName: string | null | undefined;
  role: "OWNER" | "BARBER";
  shopId: string;
  shop: Shop;
  subscription: Subscription | null;
  access: ShopAccess;
};

export const getShopContext = cache(async (): Promise<ShopContext> => {
  const { user, shopId } = await requireShopId();

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { subscription: true },
  });
  if (!shop) redirect("/register/shop");

  const { subscription, ...shopData } = shop;
  const access = resolveShopAccess(subscription);

  return {
    userId: user.id,
    userName: user.name,
    role: user.role as "OWNER" | "BARBER",
    shopId,
    shop: shopData as Shop,
    subscription,
    access,
  };
});

/**
 * Guard for dashboard pages. When the subscription hard-locks the account
 * (expired/suspended/cancelled), redirect everything except billing/settings to
 * the billing page. Pass `allowLocked` on the billing/settings pages themselves.
 */
export async function requireShopContext(options?: {
  allowLocked?: boolean;
}): Promise<ShopContext> {
  const ctx = await getShopContext();
  if (ctx.access.billingOnly && !options?.allowLocked) {
    redirect("/dashboard/billing");
  }
  return ctx;
}

/**
 * Guard for mutations that create new bookings/resources. Throws when the plan
 * doesn't allow it (grace period / expired), so server actions fail closed.
 */
export function assertCanAcceptBookings(ctx: ShopContext): void {
  if (!ctx.access.canAcceptBookings) {
    throw new Error(
      "Your subscription does not allow accepting new bookings right now.",
    );
  }
}

export function assertCanManageResources(ctx: ShopContext): void {
  if (!ctx.access.canManageResources) {
    throw new Error(
      "Your subscription does not allow managing barbers or services right now.",
    );
  }
}
