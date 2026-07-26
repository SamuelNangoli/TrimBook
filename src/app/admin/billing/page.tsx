import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, SubscriptionStatus } from "@prisma/client";
import { Wallet, Store, CalendarClock, AlertTriangle, Download } from "lucide-react";

import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { SubscriptionBadge } from "@/components/dashboard/subscription-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterBar } from "./filter-bar";
import { SubscriptionRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Billing & subscriptions" };

const PAGE_SIZE = 15;
const VALID_STATUSES: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "GRACE_PERIOD",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
];

function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function AdminBillingPage(props: {
  // Next.js 16: searchParams is async.
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const sp = await props.searchParams;

  const q = (sp.q ?? "").trim();
  const status = VALID_STATUSES.includes(sp.status as SubscriptionStatus)
    ? (sp.status as SubscriptionStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.SubscriptionWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { shop: { name: { contains: q, mode: "insensitive" } } } : {}),
  };

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    mrrAgg,
    activeShops,
    upcoming,
    overdue,
    total,
    subscriptions,
  ] = await Promise.all([
    prisma.subscription.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({
      where: { status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gte: now, lte: in7 } },
    }),
    prisma.subscription.count({ where: { status: { in: ["GRACE_PERIOD", "EXPIRED"] } } }),
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: { shop: { select: { name: true, city: true, slug: true } } },
      orderBy: { currentPeriodEnd: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const mrr = mrrAgg._sum.amount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing &amp; subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Monitor revenue and manage every shop&apos;s subscription.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/admin/billing/export" download>
            <Download className="size-4" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR" value={formatCurrency(mrr)} hint="Active subscriptions" icon={Wallet} />
        <StatCard label="Active shops" value={activeShops} icon={Store} />
        <StatCard label="Renewals in 7 days" value={upcoming} icon={CalendarClock} />
        <StatCard label="Overdue (grace/expired)" value={overdue} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-base">All subscriptions</CardTitle>
          <FilterBar defaultQuery={q} defaultStatus={status ?? ""} />
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No subscriptions match"
              description="Try clearing the search or status filter."
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renews / expires</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.shop.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.shop.city ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <SubscriptionBadge status={s.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {fmtDate(s.currentPeriodEnd ?? s.trialEndsAt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(s.amount, s.currency)}
                      </TableCell>
                      <TableCell>
                        <SubscriptionRowActions shopId={s.shopId} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Page {page} of {totalPages} · {total} total
                </span>
                <div className="flex gap-2">
                  <PageLink
                    disabled={page <= 1}
                    q={q}
                    status={status ?? ""}
                    page={page - 1}
                    label="Previous"
                  />
                  <PageLink
                    disabled={page >= totalPages}
                    q={q}
                    status={status ?? ""}
                    page={page + 1}
                    label="Next"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PageLink({
  disabled,
  q,
  status,
  page,
  label,
}: {
  disabled: boolean;
  q: string;
  status: string;
  page: number;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-8 items-center rounded-md border border-border px-3 opacity-40">
        {label}
      </span>
    );
  }
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("page", String(page));
  return (
    <Link
      href={`/admin/billing?${params.toString()}`}
      className="inline-flex h-8 items-center rounded-md border border-border px-3 hover:bg-accent"
    >
      {label}
    </Link>
  );
}
