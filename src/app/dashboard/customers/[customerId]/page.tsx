import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail, CalendarCheck, Wallet, UserPlus } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppointmentBadge } from "@/components/dashboard/appointment-badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage(props: {
  params: Promise<{ customerId: string }>;
}) {
  const { shopId, shop } = await requireShopContext();
  const { customerId } = await props.params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    include: {
      appointments: {
        orderBy: { startTime: "desc" },
        take: 50,
        include: { service: { select: { name: true } }, barber: { select: { name: true } } },
      },
    },
  });
  if (!customer) notFound();

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: shop.timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to customers
      </Link>

      <div className="flex items-center gap-4">
        <Avatar name={customer.name} className="size-14 text-lg" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" /> {customer.email}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total bookings" value={customer.totalBookings} icon={CalendarCheck} />
        <StatCard label="Total spent" value={formatCurrency(customer.totalSpent)} icon={Wallet} />
        <StatCard
          label="Customer since"
          value={
            customer.firstVisitAt
              ? new Intl.DateTimeFormat("en-GB", { timeZone: shop.timezone, month: "short", year: "numeric" }).format(customer.firstVisitAt)
              : new Intl.DateTimeFormat("en-GB", { timeZone: shop.timezone, month: "short", year: "numeric" }).format(customer.createdAt)
          }
          icon={UserPlus}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {customer.appointments.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CalendarCheck} title="No bookings yet" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-sm">{fmt.format(a.startTime)}</TableCell>
                    <TableCell className="text-sm">{a.service.name}</TableCell>
                    <TableCell className="text-sm">{a.barber.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(a.priceAtBooking, a.currency)}
                    </TableCell>
                    <TableCell>
                      <AppointmentBadge status={a.status} />
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
