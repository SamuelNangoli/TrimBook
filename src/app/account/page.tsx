import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, CalendarClock } from "lucide-react";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { AppTopbar } from "@/components/app/app-topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { AppointmentBadge } from "@/components/dashboard/appointment-badge";
import { CancelBookingButton } from "./cancel-booking-button";

export const metadata: Metadata = { title: "My bookings" };

export default async function AccountPage(props: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const user = await requireRole("CUSTOMER");
  const { booked } = await props.searchParams;

  const appointments = await prisma.appointment.findMany({
    where: { customer: { userId: user.id } },
    orderBy: { startTime: "desc" },
    take: 100,
    include: {
      shop: { select: { name: true, slug: true, timezone: true } },
      service: { select: { name: true } },
      barber: { select: { name: true } },
    },
  });

  const now = Date.now();
  const upcoming = appointments
    .filter((a) => a.startTime.getTime() >= now && ["PENDING", "CONFIRMED"].includes(a.status))
    .reverse();
  const history = appointments.filter((a) => !upcoming.includes(a));

  function fmt(date: Date, tz: string) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return (
    <>
      <AppTopbar role="Customer" name={user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
            <p className="text-sm text-muted-foreground">Hi {user.name}, here are your appointments.</p>
          </div>
          <Button asChild>
            <Link href="/shops">
              <CalendarPlus className="size-4" /> Book new
            </Link>
          </Button>
        </div>

        {booked && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm"
          >
            <CheckCircle2 className="size-4 text-success" />
            Booking requested! The shop will confirm shortly.
          </div>
        )}

        {/* Upcoming */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Upcoming</h2>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No upcoming bookings"
              description="Browse barbershops and book your next appointment."
              action={
                <Button asChild>
                  <Link href="/shops">
                    <CalendarPlus className="size-4" /> Find a barbershop
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/shops/${a.shop.slug}`} className="font-medium hover:underline">
                          {a.shop.name}
                        </Link>
                        <AppointmentBadge status={a.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {a.service.name} with {a.barber.name}
                      </p>
                      <p className="text-sm font-medium">{fmt(a.startTime, a.shop.timezone)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums font-medium">
                        {formatCurrency(a.priceAtBooking, a.currency)}
                      </span>
                      <CancelBookingButton id={a.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">History</h2>
            <div className="space-y-2">
              {history.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.shop.name}</span>
                        <AppointmentBadge status={a.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {a.service.name} with {a.barber.name} · {fmt(a.startTime, a.shop.timezone)}
                      </p>
                    </div>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      {formatCurrency(a.priceAtBooking, a.currency)}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
