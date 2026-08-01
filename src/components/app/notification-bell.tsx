"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import {
  markNotificationReadAction,
  markAllReadAction,
} from "@/server/actions/notification.actions";
import { cn } from "@/lib/utils";

export type InboxItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
  read: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell({ items }: { items: InboxItem[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((i) => !i.read).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function openItem(item: InboxItem) {
    if (!item.read) {
      startTransition(async () => {
        await markNotificationReadAction(item.id);
        router.refresh();
      });
    }
  }

  function markAll() {
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex size-9 items-center justify-center rounded-md border border-input hover:bg-accent"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-accent",
                    !item.read && "bg-primary/5",
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {!item.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <span className="flex-1 truncate text-sm font-medium">{item.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="line-clamp-2 pl-4 text-xs text-muted-foreground">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
