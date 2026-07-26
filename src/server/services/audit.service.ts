import "server-only";

import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Append-only audit trail. Security-sensitive actions (auth, subscription
 * changes, tenant mutations) should call this. Writes are best-effort: a logging
 * failure must never break the primary operation.
 */
export type AuditEntry = {
  action: string; // e.g. "auth.register", "subscription.activated"
  shopId?: string | null;
  actorId?: string | null;
  actorRole?: Role | null;
  entityType?: string;
  entityId?: string;
  description?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        shopId: entry.shopId ?? null,
        actorId: entry.actorId ?? null,
        actorRole: entry.actorRole ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        description: entry.description,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    // Never let auditing break the request.
    console.error("[audit] failed to write audit log", error);
  }
}
