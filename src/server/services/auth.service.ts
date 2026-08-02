import "server-only";

import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { slugify } from "@/lib/utils";
import { logAudit } from "@/server/services/audit.service";
import type { RegisterInput, ShopRegisterInput } from "@/lib/validations/auth";

/** Domain error the auth actions can translate into friendly field errors. */
export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailTakenError";
  }
}

async function assertEmailAvailable(email: string): Promise<void> {
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
  // Loop is bounded in practice; slugs collide rarely.
  while (await prisma.shop.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

/** Register a customer (self sign-up). Returns the new user id. */
export async function registerCustomer(input: RegisterInput): Promise<string> {
  await assertEmailAvailable(input.email);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      role: "CUSTOMER",
    },
    select: { id: true },
  });

  await logAudit({
    action: "auth.customer_registered",
    actorId: user.id,
    actorRole: "CUSTOMER",
    entityType: "User",
    entityId: user.id,
    description: `Customer ${input.email} registered`,
  });

  return user.id;
}

export type ShopRegistrationResult = {
  userId: string;
  shopId: string;
  slug: string;
};

/**
 * Onboard a shop owner: creates the owner User, the Shop, and a 14-day TRIAL
 * Subscription — all in one transaction so a tenant is never half-created.
 */
export async function registerShopOwner(
  input: ShopRegisterInput,
): Promise<ShopRegistrationResult> {
  await assertEmailAvailable(input.email);

  const passwordHash = await hashPassword(input.password);
  const slug = await uniqueShopSlug(input.shopName);

  const now = new Date();
  const trialEndsAt = new Date(
    now.getTime() + env.billing.trialDays * 24 * 60 * 60 * 1000,
  );

  const result = await prisma.$transaction(async (tx): Promise<ShopRegistrationResult> => {
    // 1. Owner user (not yet bound to a shop).
    const user = await tx.user.create({
      data: {
        name: input.ownerName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: "OWNER",
      },
      select: { id: true },
    });

    // 2. Shop owned by that user.
    const shop = await tx.shop.create({
      data: {
        name: input.shopName,
        slug,
        city: input.city,
        phone: input.phone,
        email: input.email,
        ownerId: user.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    // 3. Bind the owner to their shop (membership).
    await tx.user.update({
      where: { id: user.id },
      data: { shopId: shop.id },
    });

    // 4. Trial subscription.
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

    return { userId: user.id, shopId: shop.id, slug };
  });

  await logAudit({
    action: "auth.shop_registered",
    shopId: result.shopId,
    actorId: result.userId,
    actorRole: "OWNER",
    entityType: "Shop",
    entityId: result.shopId,
    description: `Shop "${input.shopName}" onboarded with 14-day trial`,
  });

  return result;
}
