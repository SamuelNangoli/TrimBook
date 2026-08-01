"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  toggleBookableAction,
  deleteBarberAction,
} from "@/server/actions/barber.actions";

export function BarberRowActions({
  barberId,
  isBookable,
}: {
  barberId: string;
  isBookable: boolean;
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

  function run(fn: () => Promise<{ ok: boolean; message: string }>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setOpen(false);
    startTransition(async () => {
      const res = await fn();
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        aria-label="Barber actions"
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
          className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-md border border-border bg-popover py-1 shadow-lg"
        >
          <Link
            href={`/dashboard/barbers/${barberId}`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
          >
            <SlidersHorizontal className="size-3.5" /> Manage &amp; schedule
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => run(() => toggleBookableAction(barberId))}
            className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent"
          >
            {isBookable ? "Hide from booking" : "Make bookable"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              run(
                () => deleteBarberAction(barberId),
                "Delete this barber? If they have bookings they'll be deactivated instead.",
              )
            }
            className="flex w-full items-center px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
