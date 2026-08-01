import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LogIn } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/dal";
import { resolveShopAccess, SHOP_UNAVAILABLE_MESSAGE } from "@/lib/subscription/policy";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicBookingForm } from "./public-booking-form";

export const metadata: Metadata = { title: "Book an appointment" };

export default async function BookPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      subscription: { select: { status: true } },
      services: {
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: { id: true, name: true, durationMinutes: true, price: true, currency: true },
      },
      barbers: {
        where: { status: "ACTIVE", isBookable: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  if (!shop || shop.status !== "ACTIVE") notFound();

  const access = resolveShopAccess(shop.subscription);
  const user = await getCurrentUser();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: shop.timezone }).format(new Date());

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-8">
        <Link
          href={`/shops/${slug}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to {shop.name}
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Book at {shop.name}</h1>
          <p className="text-sm text-muted-foreground">Pick a service, barber and time.</p>
        </div>

        {!access.publicBookable ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="p-5 text-sm">{SHOP_UNAVAILABLE_MESSAGE}</CardContent>
          </Card>
        ) : shop.services.length === 0 || shop.barbers.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              This shop isn&apos;t quite ready for online booking yet. Please check back soon.
            </CardContent>
          </Card>
        ) : !user ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm">Sign in to book your appointment.</p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/login?callbackUrl=/shops/${slug}/book`}>
                    <LogIn className="size-4" /> Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/register?callbackUrl=/shops/${slug}/book`}>Create account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5">
              <PublicBookingForm
                slug={slug}
                services={shop.services}
                barbers={shop.barbers}
                todayStr={todayStr}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
