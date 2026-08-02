import "server-only";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/server/services/audit.service";

/** Domain error the actions can translate into a friendly message. */
export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailTakenError";
  }
}

export async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new EmailTakenError();
}

/** Ensure a globally-unique shop slug by suffixing a counter when needed. */
async function uniqueShopSlug(name: string): Promise<string> {
  const base = slugify(name) || "shop";
  let candidate = base;
  let n = 1;
  while (await prisma.shop.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export type CreateShopInput = { shopName: string; city: string; phone: string };
export type CreateShopResult = { shopId: string; slug: string };

/**
 * Turn an already-signed-in user into a shop OWNER: creates the Shop and a
 * 14-day TRIAL subscription, and binds the user to it — all in one transaction.
 * (Passwordless onboarding: the account already exists via Google/magic link.)
 */
export async function createShopForUser(
  userId: string,
  input: CreateShopInput,
): Promise<CreateShopResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true, shopId: true },
  });
  if (user.shopId) throw new Error("You already belong to a shop.");

  const slug = await uniqueShopSlug(input.shopName);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + env.billing.trialDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx): Promise<CreateShopResult> => {
    const shop = await tx.shop.create({
      data: {
        name: input.shopName,
        slug,
        city: input.city,
        phone: input.phone,
        email: user.email,
        ownerId: userId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await tx.user.update({
      where: { id: userId },
      data: { role: "OWNER", shopId: shop.id, phone: input.phone },
    });

    await tx.subscription.create({
      data: {
        shopId: shop.id,
        plan: "STARTER",
        status: "TRIAL",
        amount: env.billing.starterPriceUgx,
        billingCycleDays: env.billing.billingCycleDays,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });

    return { shopId: shop.id, slug };
  });

  await logAudit({
    action: "auth.shop_created",
    shopId: result.shopId,
    actorId: userId,
    actorRole: "OWNER",
    entityType: "Shop",
    entityId: result.shopId,
    description: `Shop "${input.shopName}" created with 14-day trial`,
  });

  return result;
}
