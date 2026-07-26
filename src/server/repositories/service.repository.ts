import "server-only";

import type { Prisma } from "@prisma/client";
import { BaseTenantRepository } from "@/server/repositories/base.repository";

/**
 * Reference implementation of a tenant-scoped repository. Later phases add
 * Barber / Appointment / Customer repositories following exactly this shape:
 * every query goes through `scope()` / `withShop()` so `shopId` is mandatory.
 */
export class ServiceRepository extends BaseTenantRepository {
  list(where?: Prisma.ServiceWhereInput) {
    return this.db.service.findMany({
      where: this.scope(where),
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    // Scope by both id AND shopId so a guessed id from another tenant returns null.
    const service = await this.db.service.findFirst({
      where: this.scope({ id }),
    });
    this.assertOwned(service);
    return service;
  }

  create(data: Omit<Prisma.ServiceCreateInput, "shop">) {
    return this.db.service.create({
      data: this.withShop(data) as Prisma.ServiceUncheckedCreateInput,
    });
  }

  async update(id: string, data: Prisma.ServiceUpdateInput) {
    // updateMany with shopId filter guarantees we never touch another tenant.
    const result = await this.db.service.updateMany({
      where: this.scope({ id }),
      data,
    });
    return result.count > 0;
  }

  async remove(id: string) {
    const result = await this.db.service.deleteMany({
      where: this.scope({ id }),
    });
    return result.count > 0;
  }
}
