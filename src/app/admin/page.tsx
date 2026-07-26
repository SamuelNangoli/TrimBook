import type { Metadata } from "next";
import Link from "next/link";
import { Store, Wallet, Users, CalendarCheck, ArrowRight } from "lucide-react";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Platform admin" };

export default async function AdminPage() {
  await requireRole("SUPER_ADMIN");

  const [shops, activeSubs, users, appointments, mrrAgg] = await Promise.all([
    prisma.shop.count(),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.user.count(),
    prisma.appointment.count(),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE" },
      _sum: { amount: true },
    }),
  ]);

  const mrr = mrrAgg._sum.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
          <p className="text-sm text-muted-foreground">
            Health of the whole TrimBook platform.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/billing">
            Billing &amp; subscriptions
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly recurring revenue"
          value={formatCurrency(mrr)}
          hint="Active subscriptions"
          icon={Wallet}
        />
        <StatCard label="Total shops" value={shops} icon={Store} />
        <StatCard label="Active / trial subs" value={activeSubs} icon={CalendarCheck} />
        <StatCard label="Total users" value={users} icon={Users} />
      </div>

      <p className="text-sm text-muted-foreground">
        Growth charts, recent payments and support tickets expand in Phase 8.
        Subscription management is live under Billing.
      </p>
    </div>
  );
}
