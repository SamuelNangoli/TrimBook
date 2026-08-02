"use client";

import { Menu } from "lucide-react";

import { useSidebar } from "@/components/dashboard/sidebar-context";

/** Hamburger button (topbar) that opens/closes the sidebar drawer. */
export function SidebarToggle() {
  const { toggle, open } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="flex size-9 items-center justify-center rounded-md border border-input text-foreground hover:bg-accent"
    >
      <Menu className="size-5" />
    </button>
  );
}
