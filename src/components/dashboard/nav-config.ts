/** Icon key – a plain string that can cross the server→client boundary. */
export type IconKey =
  | "LayoutDashboard"
  | "CalendarCheck"
  | "Users"
  | "Scissors"
  | "Contact"
  | "CreditCard"
  | "Settings"
  | "Store"
  | "LifeBuoy";

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  /** Not built yet — shown but not navigable (explained, not hidden). */
  soon?: boolean;
  /** Locked out by an inactive subscription. */
  locksWithSubscription?: boolean;
};

export const OWNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard", locksWithSubscription: true },
  { href: "/dashboard/bookings", label: "Bookings", icon: "CalendarCheck" },
  { href: "/dashboard/barbers", label: "Barbers", icon: "Users" },
  { href: "/dashboard/services", label: "Services", icon: "Scissors" },
  { href: "/dashboard/customers", label: "Customers", icon: "Contact", soon: true },
  { href: "/dashboard/billing", label: "Billing", icon: "CreditCard" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
  { href: "/admin/billing", label: "Billing & subscriptions", icon: "CreditCard" },
  { href: "/admin/shops", label: "Shops", icon: "Store", soon: true },
  { href: "/admin/tickets", label: "Support", icon: "LifeBuoy", soon: true },
];
