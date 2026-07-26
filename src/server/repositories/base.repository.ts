import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { TenantContext } from "@/server/tenant/context";
import { assertShopAccess } from "@/server/tenant/context";

/**
 * Base class for tenant-scoped repositories.
 *
 * Every repository is constructed with a resolved `shopId` (obtained via
 * `resolveScopeShopId`, which locks staff to their own shop). Concrete
 * repositories MUST route all reads/writes through `scope()` so `shopId` is
 * always part of the filter and never omitted by accident.
 */
export abstract class BaseTenantRepository {
  protected readonly db = prisma;

  constructor(
    protected readonly ctx: TenantContext,
    protected readonly shopId: string,
  ) {}

  /** Merge the tenant's shopId into a Prisma `where` object. */
  protected scope<T extends object>(where?: T): T & { shopId: string } {
    return { ...(where ?? ({} as T)), shopId: this.shopId };
  }

  /** Merge the tenant's shopId into a Prisma `create`/`update` data object. */
  protected withShop<T extends object>(data: T): T & { shopId: string } {
    return { ...data, shopId: this.shopId };
  }

  /**
   * Defense-in-depth: verify a row we just loaded really belongs to this shop
   * before handing it back. Call after any lookup by primary key.
   */
  protected assertOwned(row: { shopId: string } | null): void {
    if (row) assertShopAccess(this.ctx, row.shopId);
  }
}
