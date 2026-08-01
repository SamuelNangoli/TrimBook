"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DayOfWeek } from "@prisma/client";

import { saveWorkingHoursAction } from "@/server/actions/schedule.actions";
import { Button } from "@/components/ui/button";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
  { key: "SATURDAY", label: "Saturday" },
  { key: "SUNDAY", label: "Sunday" },
];

export type DayHours = {
  dayOfWeek: DayOfWeek;
  isClosed: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
};

const inputClass =
  "h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";

export function WorkingHoursEditor({
  barberId,
  initial,
}: {
  barberId: string;
  initial: Record<DayOfWeek, DayHours>;
}) {
  const [rows, setRows] = useState<Record<DayOfWeek, DayHours>>(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function update(day: DayOfWeek, patch: Partial<DayHours>) {
    setRows((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    for (const { key } of DAYS) {
      const r = rows[key];
      if (!r.isClosed) fd.set(`open_${key}`, "true");
      fd.set(`start_${key}`, r.start);
      fd.set(`end_${key}`, r.end);
    }
    startTransition(async () => {
      const res = await saveWorkingHoursAction(barberId, fd);
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const r = rows[key];
          return (
            <div key={key} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!r.isClosed}
                  onChange={(e) => update(key, { isClosed: !e.target.checked })}
                  className="size-4 rounded border-input"
                />
                {label}
              </label>
              {r.isClosed ? (
                <span className="text-sm text-muted-foreground">Closed</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={r.start}
                    onChange={(e) => update(key, { start: e.target.value })}
                    className={inputClass}
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    value={r.end}
                    onChange={(e) => update(key, { end: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Saving…" : "Save working hours"}
      </Button>
    </form>
  );
}
