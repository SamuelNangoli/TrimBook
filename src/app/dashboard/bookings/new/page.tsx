import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Scissors, Users } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewBookingForm } from "./new-booking-form";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const { shopId, shop, access } = await requireShopContext();

  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      where: { shopId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, price: true, currency: true },
    }),
    prisma.barber.findMany({
      where: { shopId, status: "ACTIVE", isBookable: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: shop.timezone }).format(
    new Date(),
  );

  const missing = services.length === 0 || barbers.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to bookings
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New booking</CardTitle>
          <CardDescription>
            Book a walk-in or phone customer into an available slot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!access.canAcceptBookings ? (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              New bookings are paused while your subscription is inactive.
            </p>
          ) : missing ? (
            <EmptyState
              icon={services.length === 0 ? Scissors : Users}
              title={services.length === 0 ? "Add a service first" : "Add a barber first"}
              description={
                services.length === 0
                  ? "You need at least one active service before taking bookings."
                  : "You need at least one bookable barber before taking bookings."
              }
              action={
                <Button asChild>
                  <Link href={services.length === 0 ? "/dashboard/services/new" : "/dashboard/barbers"}>
                    {services.length === 0 ? "New service" : "Manage barbers"}
                  </Link>
                </Button>
              }
            />
          ) : (
            <NewBookingForm services={services} barbers={barbers} todayStr={todayStr} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
