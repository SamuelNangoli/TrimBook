import type { Subscription, SubscriptionStatus } from "@prisma/client";

/**
 * Subscription policy — the single source of truth for "what can this shop do
 * right now?" These are PURE functions (no DB, no I/O) so they can run on the
 * server for enforcement and on the client for UI hints, and be unit-tested.
 *
 * The hourly cron job (Phase 2) is responsible for moving `status` between
 * states based on dates; these helpers interpret whatever the current state is.
 */

export type ShopAccess = {
  status: SubscriptionStatus;
  /** Owner can reach the full dashboard and manage the shop. */
  dashboardUnlocked: boolean;
  /** New bookings may be created (by customers) / accepted (by staff). */
  canAcceptBookings: boolean;
  /** Owner can add/edit barbers and services. */
  canManageResources: boolean;
  /** The public shop profile & booking page are visible to customers. */
  publicBookable: boolean;
  /** A persistent renewal banner should be shown to the owner. */
  showRenewalBanner: boolean;
  /** Only billing/settings/support are reachable (hard lock). */
  billingOnly: boolean;
  /** Short machine-readable reason, for banners and API responses. */
  reason:
    | "trial"
    | "active"
    | "grace"
    | "expired"
    | "suspended"
    | "cancelled"
    | "none";
};

const FULL_ACCESS: Omit<ShopAccess, "status" | "reason"> = {
  dashboardUnlocked: true,
  canAcceptBookings: true,
  canManageResources: true,
  publicBookable: true,
  showRenewalBanner: false,
  billingOnly: false,
};

/**
 * Resolve what a shop may do given its subscription. A missing subscription is
 * treated as no access (should not happen for a real shop, but fail closed).
 */
export function resolveShopAccess(
  subscription: Pick<Subscription, "status"> | null,
): ShopAccess {
  if (!subscription) {
    return {
      status: "EXPIRED",
      dashboardUnlocked: false,
      canAcceptBookings: false,
      canManageResources: false,
      publicBookable: false,
      showRenewalBanner: true,
      billingOnly: true,
      reason: "none",
    };
  }

  switch (subscription.status) {
    case "TRIAL":
      return { ...FULL_ACCESS, status: "TRIAL", reason: "trial" };

    case "ACTIVE":
      return { ...FULL_ACCESS, status: "ACTIVE", reason: "active" };

    case "GRACE_PERIOD":
      // Existing appointments still viewable/completable, but nothing new.
      return {
        status: "GRACE_PERIOD",
        dashboardUnlocked: true,
        canAcceptBookings: false,
        canManageResources: false,
        publicBookable: false,
        showRenewalBanner: true,
        billingOnly: false,
        reason: "grace",
      };

    case "EXPIRED":
      return {
        status: "EXPIRED",
        dashboardUnlocked: false,
        canAcceptBookings: false,
        canManageResources: false,
        publicBookable: false,
        showRenewalBanner: true,
        billingOnly: true,
        reason: "expired",
      };

    case "SUSPENDED":
      return {
        status: "SUSPENDED",
        dashboardUnlocked: false,
        canAcceptBookings: false,
        canManageResources: false,
        publicBookable: false,
        showRenewalBanner: true,
        billingOnly: true,
        reason: "suspended",
      };

    case "CANCELLED":
      return {
        status: "CANCELLED",
        dashboardUnlocked: false,
        canAcceptBookings: false,
        canManageResources: false,
        publicBookable: false,
        showRenewalBanner: true,
        billingOnly: true,
        reason: "cancelled",
      };

    default:
      return {
        status: subscription.status,
        dashboardUnlocked: false,
        canAcceptBookings: false,
        canManageResources: false,
        publicBookable: false,
        showRenewalBanner: true,
        billingOnly: true,
        reason: "none",
      };
  }
}

/** Public-facing message when a customer hits an unavailable shop. */
export const SHOP_UNAVAILABLE_MESSAGE =
  "This barbershop is temporarily unavailable because its subscription has expired. Please choose another shop.";
