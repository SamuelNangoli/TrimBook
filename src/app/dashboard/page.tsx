import type { Metadata } from "next";
import {
  CalendarClock,
  CalendarCheck,
  Users,
  Scissors,
  Wallet,
  UserPlus,
} from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { SubscriptionBadge } from "@/components/dashboard/subscription-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Overview" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function DashboardPage() {
  // Redirects to /dashboard/billing if the subscription hard-locks the account.
  const { shop, shopId, subscription, access } = await requireShopContext();

  const now = new Date();
  const todayStart = startOfToday();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth();

  // All reads are tenant-scoped by shopId.
  const [
    bookingsToday,
    upcoming,
    completedThisMonth,
    barbers,
    services,
    revenueAgg,
    newCustomers,
  ] = await Promise.all([
    prisma.appointment.count({
      where: { shopId, startTime: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.appointment.count({
      where: { shopId, startTime: { gte: now }, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.appointment.count({
      where: { shopId, status: "COMPLETED", startTime: { gte: monthStart } },
    }),
    prisma.barber.count({ where: { shopId } }),
    prisma.service.count({ where: { shopId, status: "ACTIVE" } }),
    prisma.appointment.aggregate({
      where: { shopId, status: "COMPLETED", startTime: { gte: monthStart } },
      _sum: { priceAtBooking: true },
    }),
    prisma.customer.count({ where: { shopId, createdAt: { gte: monthStart } } }),
  ]);

  const revenue = revenueAgg._sum.priceAtBooking ?? 0;
  const hasBookings = bookingsToday + upcoming + completedThisMonth > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            {shop.city ? `${shop.city} · ` : ""}Here&apos;s how your shop is doing.
          </p>
        </div>
        {subscription && <SubscriptionBadge status={subscription.status} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bookings today" value={bookingsToday} icon={CalendarCheck} />
        <StatCard label="Upcoming" value={upcoming} icon={CalendarClock} />
        <StatCard label="Barbers" value={barbers} icon={Users} />
        <StatCard label="Active services" value={services} icon={Scissors} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue this month"
          value={formatCurrency(revenue)}
          hint="From completed appointments"
          icon={Wallet}
        />
        <StatCard
          label="Completed this month"
          value={completedThisMonth}
          icon={CalendarCheck}
        />
        <StatCard label="New customers" value={newCustomers} icon={UserPlus} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {hasBookings ? (
            <p className="text-sm text-muted-foreground">
              Booking timeline and top-performer widgets arrive with the booking
              system (Phase 3).
            </p>
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title="No bookings yet"
              description={
                access.canAcceptBookings
                  ? "Once customers start booking, today's schedule and revenue will appear here."
                  : "New bookings are paused while your subscription is inactive."
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
