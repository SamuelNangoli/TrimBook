import type { Metadata } from "next";
import { Receipt, CheckCircle2 } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { SubscriptionBadge } from "@/components/dashboard/subscription-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RenewButton } from "./renew-button";

export const metadata: Metadata = { title: "Billing" };

function fmtDate(d: Date | null | undefined) {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function BillingPage() {
  // Reachable even when locked — this is the renewal surface.
  const { shopId, subscription, access } = await requireShopContext({
    allowLocked: true,
  });

  const payments = await prisma.payment.findMany({
    where: { shopId, type: "SUBSCRIPTION" },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  const amount = subscription?.amount ?? 25000;
  const renewLabel = access.reason === "trial" ? "Subscribe now" : "Renew now";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and view payment history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Starter plan</CardTitle>
              <CardDescription>
                {formatCurrency(amount)} / month · 30-day billing cycle
              </CardDescription>
            </div>
            {subscription && <SubscriptionBadge status={subscription.status} />}
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {subscription?.status === "TRIAL" ? "Trial ends" : "Renews / expires"}
                </dt>
                <dd className="mt-0.5 font-medium">
                  {fmtDate(subscription?.currentPeriodEnd ?? subscription?.trialEndsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount due</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{formatCurrency(amount)}</dd>
              </div>
              {subscription?.gracePeriodEndsAt && access.reason === "grace" && (
                <div>
                  <dt className="text-muted-foreground">Grace period ends</dt>
                  <dd className="mt-0.5 font-medium">{fmtDate(subscription.gracePeriodEndsAt)}</dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <RenewButton label={renewLabel} />
              <p className="text-xs text-muted-foreground">
                Mobile Money &amp; card payments (MTN, Airtel, Flutterwave) go live
                in Phase 7. This confirms a payment for now.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What renewing unlocks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What you get</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[
                "Unlimited bookings",
                "Barber & service management",
                "Public booking page",
                "Reports & analytics",
                "Automated reminders",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment history</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              description="Your subscription receipts will appear here after your first payment."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">
                      {p.receiptNumber ?? p.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{fmtDate(p.paidAt ?? p.createdAt)}</TableCell>
                    <TableCell className="capitalize">
                      {p.provider.toLowerCase().replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(p.amount, p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "SUCCESSFUL" ? "success" : "secondary"}>
                        {p.status.toLowerCase()}
                      </Badge>
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
