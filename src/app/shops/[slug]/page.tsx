import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone, Clock, CalendarPlus, AlertTriangle } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { resolveShopAccess, SHOP_UNAVAILABLE_MESSAGE } from "@/lib/subscription/policy";
import { formatCurrency } from "@/lib/utils";
import { PublicHeader } from "@/components/public/public-header";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const shop = await prisma.shop.findUnique({ where: { slug }, select: { name: true } });
  return { title: shop?.name ?? "Barbershop" };
}

export default async function ShopProfilePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      subscription: { select: { status: true } },
      services: { where: { status: "ACTIVE" }, orderBy: { price: "asc" } },
      barbers: {
        where: { status: "ACTIVE", isBookable: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!shop || shop.status !== "ACTIVE") notFound();

  const access = resolveShopAccess(shop.subscription);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{shop.name}</h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {shop.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {shop.city}
                </span>
              )}
              {shop.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-4" /> {shop.phone}
                </span>
              )}
            </div>
            {shop.description && (
              <p className="mt-3 max-w-prose text-muted-foreground">{shop.description}</p>
            )}
          </div>
          {access.publicBookable && (
            <Button asChild size="lg" className="min-h-11">
              <Link href={`/shops/${shop.slug}/book`}>
                <CalendarPlus className="size-4" /> Book now
              </Link>
            </Button>
          )}
        </div>

        {!access.publicBookable ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="flex items-start gap-3 p-5 text-sm">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[color:var(--warning)]" />
              <div>
                <p className="font-medium">Temporarily unavailable</p>
                <p className="mt-1 text-muted-foreground">{SHOP_UNAVAILABLE_MESSAGE}</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/shops">Browse other shops</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Services */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Services</h2>
              {shop.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services listed yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {shop.services.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-medium">{s.name}</p>
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" /> {s.durationMinutes} min
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatCurrency(s.price, s.currency)}
                        </span>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Barbers */}
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Our barbers</h2>
              {shop.barbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No barbers available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {shop.barbers.map((b) => (
                    <div key={b.id} className="flex w-40 flex-col items-center gap-2 text-center">
                      <Avatar name={b.name} src={b.photoUrl} className="size-16 text-lg" />
                      <div>
                        <p className="text-sm font-medium">{b.name}</p>
                        {b.speciality && (
                          <p className="text-xs text-muted-foreground">{b.speciality}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="rounded-lg border border-border p-6 text-center">
              <p className="font-medium">Ready for a fresh cut?</p>
              <Button asChild size="lg" className="mt-3 min-h-11">
                <Link href={`/shops/${shop.slug}/book`}>
                  <CalendarPlus className="size-4" /> Book an appointment
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
