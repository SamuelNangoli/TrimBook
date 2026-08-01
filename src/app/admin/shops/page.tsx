import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Search, Store } from "lucide-react";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SubscriptionBadge } from "@/components/dashboard/subscription-badge";

export const metadata: Metadata = { title: "Shops" };

export default async function AdminShopsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const { q = "" } = await props.searchParams;
  const query = q.trim();

  const where: Prisma.ShopWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { owner: { is: { email: { contains: query, mode: "insensitive" } } } },
        ],
      }
    : {};

  const shops = await prisma.shop.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: { select: { name: true, email: true } },
      subscription: { select: { status: true } },
      _count: { select: { barbers: true, services: true, appointments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shops</h1>
        <p className="text-sm text-muted-foreground">Every barbershop on the platform.</p>
      </div>

      <form className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={query} placeholder="Search shop, city or owner email…" className="pl-9" />
      </form>

      <Card>
        <CardContent className="p-0">
          {shops.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Store} title="No shops found" description="Try a different search." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead>Subscription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.city ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{s.owner.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.owner.email}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s._count.barbers} barbers · {s._count.services} services
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s._count.appointments}</TableCell>
                    <TableCell>
                      {s.subscription ? (
                        <SubscriptionBadge status={s.subscription.status} />
                      ) : (
                        <span className="text-xs text-muted-foreground">none</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
