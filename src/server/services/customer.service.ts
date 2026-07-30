import "server-only";

import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Find or create a per-shop customer record. Matching is by phone within the
 * shop (customers are tenant-scoped). If a `userId` is given (a registered
 * platform user booking for themselves), we match on that first.
 */
export async function findOrCreateCustomer(input: {
  shopId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
}): Promise<Customer> {
  if (input.userId) {
    const existing = await prisma.customer.findFirst({
      where: { shopId: input.shopId, userId: input.userId },
    });
    if (existing) return existing;
  }

  if (input.phone) {
    const byPhone = await prisma.customer.findFirst({
      where: { shopId: input.shopId, phone: input.phone },
    });
    if (byPhone) return byPhone;
  }

  return prisma.customer.create({
    data: {
      shopId: input.shopId,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      userId: input.userId ?? null,
    },
  });
}
