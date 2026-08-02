"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  CalendarCheck,
  Users,
  Scissors,
  Contact,
  CreditCard,
  Settings,
  Store,
  LifeBuoy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import type { NavItem, IconKey } from "@/components/dashboard/nav-config";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/dashboard/sidebar-context";

const ICONS: Record<IconKey, LucideIcon> = {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Scissors,
  Contact,
  CreditCard,
  Settings,
  Store,
  LifeBuoy,
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-1" aria-label="Dashboard">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.icon];

        if (item.soon) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              title="Coming soon"
              className="flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                {item.label}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                Soon
              </Badge>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Slide-out sidebar drawer, toggled by the topbar hamburger (via SidebarToggle
 * + SidebarProvider). Hidden by default on every screen size and animates in
 * from the left; closes on backdrop click, the X, or selecting an item.
 */
export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { open, close } = useSidebar();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-background p-4 shadow-xl transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="size-4" />
            </span>
            {APP_NAME}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
          >
            <X className="size-5" />
          </button>
        </div>
        <NavLinks items={items} pathname={pathname} onNavigate={close} />
      </aside>
    </>
  );
}
