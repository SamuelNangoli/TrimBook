"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentStatus } from "@prisma/client";

import {
  confirmBookingAction,
  rejectBookingAction,
  cancelBookingAction,
  arrivedBookingAction,
  completeBookingAction,
  noShowBookingAction,
  type ActionResult,
} from "@/server/actions/booking.actions";
import { cn } from "@/lib/utils";

type Item = { label: string; run: () => Promise<ActionResult>; danger?: boolean; confirm?: string };

/** Actions available depend on the current status. */
function itemsFor(id: string, status: AppointmentStatus): Item[] {
  const confirm = { label: "Confirm", run: () => confirmBookingAction(id) };
  const arrived = { label: "Mark arrived", run: () => arrivedBookingAction(id) };
  const complete = { label: "Mark completed", run: () => completeBookingAction(id) };
  const noShow = { label: "Mark no-show", run: () => noShowBookingAction(id), danger: true };
  const reject = {
    label: "Decline",
    run: () => rejectBookingAction(id),
    danger: true,
    confirm: "Decline this booking?",
  };
  const cancel = {
    label: "Cancel",
    run: () => cancelBookingAction(id),
    danger: true,
    confirm: "Cancel this booking?",
  };

  switch (status) {
    case "PENDING":
      return [confirm, reject];
    case "CONFIRMED":
      return [arrived, complete, noShow, cancel];
    default:
      return [];
  }
}

export function BookingRowActions({
  id,
  status,
}: {
  id: string;
  status: AppointmentStatus;
}) {
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

  const items = itemsFor(id, status);
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  function handle(item: Item) {
    if (item.confirm && !window.confirm(item.confirm)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await item.run();
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label="Booking actions"
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
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => handle(item)}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                item.danger && "text-destructive",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
