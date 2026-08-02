"use client";

import { createContext, useCallback, useContext, useState } from "react";

type SidebarCtx = { open: boolean; toggle: () => void; close: () => void };

const Ctx = createContext<SidebarCtx | null>(null);

/** Shares the sidebar drawer's open state between the topbar toggle + drawer. */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return <Ctx.Provider value={{ open, toggle, close }}>{children}</Ctx.Provider>;
}

export function useSidebar(): SidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
