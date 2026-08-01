import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search, Contact } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Customers" };

function fmtDate(d: Date | null | undefined, tz: string) {
  return d
    ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric" }).format(d)
    : "—";
}

export default async function CustomersPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { shopId, shop } = await requireShopContext();
  const { q = "" } = await props.searchParams;
  const query = q.trim();

  const where: Prisma.CustomerWhereInput = {
    shopId,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.customer.count({ where: { shopId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who has booked with {shop.name} · {total} total
        </p>
      </div>

      <form className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={query} placeholder="Search name, phone or email…" className="pl-9" />
      </form>

      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Contact}
                title={query ? "No customers match" : "No customers yet"}
                description={
                  query
                    ? "Try a different search."
                    : "Customers appear here automatically once they book — online or as walk-ins you add."
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead>Last visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3">
                        <Avatar name={c.name} />
                        <span className="font-medium hover:underline">{c.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone ?? c.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.totalBookings}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(c.totalSpent)}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(c.lastVisitAt, shop.timezone)}</TableCell>
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
