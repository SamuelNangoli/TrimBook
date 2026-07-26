"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  adminActivate,
  adminSuspend,
  adminExtend,
  adminComp,
  adminCancel,
  type AdminActionResult,
} from "@/server/actions/admin-billing.actions";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  run: () => Promise<AdminActionResult>;
  danger?: boolean;
  confirm?: string;
};

export function SubscriptionRowActions({ shopId }: { shopId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const actions: Action[] = [
    { label: "Activate", run: () => adminActivate(shopId) },
    { label: "Extend 30 days", run: () => adminExtend(shopId, 30) },
    { label: "Comp 30 days", run: () => adminComp(shopId, 30) },
    { label: "Suspend", run: () => adminSuspend(shopId), danger: true, confirm: "Suspend this shop? They'll be locked out except billing." },
    { label: "Cancel", run: () => adminCancel(shopId), danger: true, confirm: "Cancel this subscription? Data is retained 90 days." },
  ];

  function handle(a: Action) {
    if (a.confirm && !window.confirm(a.confirm)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await a.run();
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label="Manage subscription"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-50"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg"
        >
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => handle(a)}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                a.danger && "text-destructive",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
