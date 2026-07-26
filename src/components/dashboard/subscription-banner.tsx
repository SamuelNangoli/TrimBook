import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

import type { Subscription } from "@prisma/client";
import type { ShopAccess } from "@/lib/subscription/policy";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

/**
 * Persistent renewal banner shown to owners during trial-ending, grace and
 * locked states. Conveys urgency with icon + text + action (not color alone).
 */
export function SubscriptionBanner({
  access,
  subscription,
}: {
  access: ShopAccess;
  subscription: Subscription | null;
}) {
  if (!access.showRenewalBanner) return null;

  const end = subscription?.currentPeriodEnd ?? null;
  const daysLeft = end
    ? Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  const tone = access.billingOnly ? "danger" : "warn";
  const Icon = access.billingOnly ? AlertTriangle : Clock;

  const message = (() => {
    switch (access.reason) {
      case "trial":
        return daysLeft !== null && daysLeft > 0
          ? `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Add a payment to keep your shop running.`
          : "Your free trial is ending. Renew to keep your shop running.";
      case "grace":
        return "Your subscription has expired — you're in the 7-day grace period. Existing bookings still work, but you can't take new ones until you renew.";
      case "expired":
        return "Your subscription has expired and your dashboard is locked. Renew to restore full access.";
      case "suspended":
        return "Your account has been suspended by the platform. Contact support or settle billing to continue.";
      case "cancelled":
        return "Your subscription is cancelled. Your data is retained for 90 days — renew any time to reactivate.";
      default:
        return "Renew your subscription to continue using TrimBook.";
    }
  })();

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
        tone === "danger"
          ? "border-destructive/30 bg-destructive/10"
          : "border-warning/40 bg-warning/10",
      )}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            tone === "danger" ? "text-destructive" : "text-[color:var(--warning)]",
          )}
        />
        <p>{message}</p>
      </div>
      <Link
        href="/dashboard/billing"
        className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Renew now · {formatCurrency(subscription?.amount ?? 25000)}
      </Link>
    </div>
  );
}
