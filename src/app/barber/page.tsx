import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { localDayStartUtc } from "@/lib/booking/scheduling";
import { formatCurrency } from "@/lib/utils";
import { AppTopbar } from "@/components/app/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BookingRowActions } from "@/app/dashboard/bookings/booking-row-actions";

export const metadata: Metadata = { title: "My day" };

export default async function BarberPage() {
  const user = await requireRole("BARBER");

  const barber = user.shopId
    ? await prisma.barber.findFirst({ where: { userId: user.id, shopId: user.shopId } })
    : null;
  const shop = user.shopId
    ? await prisma.shop.findUnique({ where: { id: user.shopId }, select: { timezone: true } })
    : null;

  const tz = shop?.timezone ?? "Africa/Kampala";
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
  const dayStart = localDayStartUtc(todayStr, tz);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const include = {
    customer: { select: { name: true, phone: true } },
    service: { select: { name: true } },
  } as const;

  const [appointments, upcoming] =
    barber && user.shopId
      ? await Promise.all([
          prisma.appointment.findMany({
            where: {
              shopId: user.shopId,
              barberId: barber.id,
              startTime: { gte: dayStart, lt: dayEnd },
            },
            orderBy: { startTime: "asc" },
            include,
          }),
          prisma.appointment.findMany({
            where: {
              shopId: user.shopId,
              barberId: barber.id,
              startTime: { gte: dayEnd },
              status: { in: ["PENDING", "CONFIRMED"] },
            },
            orderBy: { startTime: "asc" },
            take: 20,
            include,
          }),
        ])
      : [[], []];

  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const fmtDT = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <AppTopbar role="Barber" name={user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today&apos;s appointments</h1>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: tz,
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </p>
        </div>

        {!barber ? (
          <Card>
            <CardHeader>
              <CardTitle>No barber profile linked</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your account isn&apos;t linked to a barber profile yet. Ask your shop
              owner to add you under Barbers.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={CalendarCheck}
                    title="Nothing booked today"
                    description="Enjoy the quiet — new bookings will appear here automatically."
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap font-medium tabular-nums">
                          {fmt.format(a.startTime)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{a.customer.name}</div>
                          {a.customer.phone && (
                            <div className="text-xs text-muted-foreground">{a.customer.phone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{a.service.name}</TableCell>
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
        )}

        {barber && upcoming.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Upcoming</h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcoming.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-sm">{fmtDT.format(a.startTime)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{a.customer.name}</div>
                          {a.customer.phone && (
                            <div className="text-xs text-muted-foreground">{a.customer.phone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{a.service.name}</TableCell>
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
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
