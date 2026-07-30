import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, CalendarCheck } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency, cn } from "@/lib/utils";
import { localDayStartUtc } from "@/lib/booking/scheduling";
import { Button } from "@/components/ui/button";
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
import { AppointmentBadge } from "@/components/dashboard/appointment-badge";
import { BookingRowActions } from "./booking-row-actions";

export const metadata: Metadata = { title: "Bookings" };

type View = "today" | "upcoming" | "all";
const VIEWS: { key: View; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "all", label: "All" },
];

export default async function BookingsPage(props: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { shopId, shop, access } = await requireShopContext();
  const sp = await props.searchParams;
  const view: View = VIEWS.some((v) => v.key === sp.view) ? (sp.view as View) : "today";

  const tz = shop.timezone;
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const dayStart = localDayStartUtc(todayStr, tz);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  let where: Prisma.AppointmentWhereInput = { shopId };
  let orderBy: Prisma.AppointmentOrderByWithRelationInput = { startTime: "asc" };

  if (view === "today") {
    where = { shopId, startTime: { gte: dayStart, lt: dayEnd } };
  } else if (view === "upcoming") {
    where = { shopId, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } };
  } else {
    orderBy = { startTime: "desc" };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy,
    take: 100,
    include: {
      customer: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      barber: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            Manage appointments and keep your chairs full.
          </p>
        </div>
        <Button asChild disabled={!access.canAcceptBookings}>
          <Link href="/dashboard/bookings/new">
            <Plus className="size-4" />
            New booking
          </Link>
        </Button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1 text-sm w-fit">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/dashboard/bookings?view=${v.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              view === v.key
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarCheck}
                title={view === "today" ? "No bookings today" : "No bookings yet"}
                description={
                  access.canAcceptBookings
                    ? "Create a booking for a walk-in, or share your booking page with customers."
                    : "New bookings are paused while your subscription is inactive."
                }
                action={
                  access.canAcceptBookings ? (
                    <Button asChild>
                      <Link href="/dashboard/bookings/new">
                        <Plus className="size-4" /> New booking
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Barber</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {fmt.format(a.startTime)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{a.customer.name}</div>
                      {a.customer.phone && (
                        <div className="text-xs text-muted-foreground">{a.customer.phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{a.service.name}</TableCell>
                    <TableCell className="text-sm">{a.barber.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(a.priceAtBooking, a.currency)}
                    </TableCell>
                    <TableCell>
                      <AppointmentBadge status={a.status} />
                    </TableCell>
                    <TableCell>
                      <BookingRowActions id={a.id} status={a.status} />
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
