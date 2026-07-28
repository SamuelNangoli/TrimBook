"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
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
import type { NavItem, IconKey } from "@/components/dashboard/nav-config";
import { Badge } from "@/components/ui/badge";

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

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border p-4 lg:block">
        <div className="sticky top-20">
          <NavLinks items={items} pathname={pathname} />
        </div>
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-11 items-center justify-center rounded-md border border-input"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="flex size-9 items-center justify-center rounded-md hover:bg-accent"
                >
                  <X className="size-5" />
                </button>
              </div>
              <NavLinks
                items={items}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
