import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search, MapPin, Scissors, Users, ArrowRight } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { PublicHeader } from "@/components/public/public-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Browse barbershops",
  description: "Find and book a barbershop near you.",
};

export default async function ShopsPage(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await props.searchParams;
  const query = q.trim();

  // Only shops that are active AND whose subscription allows public booking.
  const where: Prisma.ShopWhereInput = {
    status: "ACTIVE",
    subscription: { is: { status: { in: ["TRIAL", "ACTIVE"] } } },
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const shops = await prisma.shop.findMany({
    where,
    orderBy: { name: "asc" },
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      city: true,
      _count: {
        select: {
          services: { where: { status: "ACTIVE" } },
          barbers: { where: { status: "ACTIVE", isBookable: true } },
        },
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Find a barbershop</h1>
          <p className="mt-1 text-muted-foreground">
            Browse shops, pick a barber and book in a few taps.
          </p>
        </div>

        <form className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search by shop name or city…"
            className="pl-9"
            aria-label="Search barbershops"
          />
        </form>

        {shops.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="No barbershops found"
            description={query ? `Nothing matched “${query}”. Try another search.` : "Check back soon — new shops are joining."}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <Link key={shop.id} href={`/shops/${shop.slug}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div>
                      <h2 className="font-semibold group-hover:text-primary">{shop.name}</h2>
                      {shop.city && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" /> {shop.city}
                        </p>
                      )}
                    </div>
                    {shop.description && (
                      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                        {shop.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Scissors className="size-3.5" /> {shop._count.services} services
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {shop._count.barbers} barbers
                      </span>
                      <ArrowRight className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
