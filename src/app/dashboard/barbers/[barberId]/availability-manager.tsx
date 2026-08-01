"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, CalendarOff } from "lucide-react";

import {
  addAvailabilityAction,
  deleteAvailabilityAction,
} from "@/server/actions/schedule.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export type ExceptionRow = {
  id: string;
  type: "LEAVE" | "BLOCK" | "EXTRA";
  startLabel: string;
  endLabel: string;
  reason: string | null;
};

const TYPE_LABEL: Record<ExceptionRow["type"], { label: string; variant: "warning" | "secondary" | "success" }> = {
  LEAVE: { label: "Leave", variant: "warning" },
  BLOCK: { label: "Blocked", variant: "secondary" },
  EXTRA: { label: "Extra hours", variant: "success" },
};

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AvailabilityManager({
  barberId,
  exceptions,
}: {
  barberId: string;
  exceptions: ExceptionRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addAvailabilityAction(barberId, fd);
      if (res.ok) {
        toast.success(res.message);
        setShowForm(false);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function onDelete(id: string) {
    startDeleting(async () => {
      const res = await deleteAvailabilityAction(id);
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {exceptions.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No time off or blocks"
          description="Add leave, blocked slots or extra hours to fine-tune availability."
        />
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {exceptions.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_LABEL[ex.type].variant}>{TYPE_LABEL[ex.type].label}</Badge>
                  <span className="text-sm">
                    {ex.startLabel} → {ex.endLabel}
                  </span>
                </div>
                {ex.reason && <p className="mt-0.5 text-xs text-muted-foreground">{ex.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => onDelete(ex.id)}
                disabled={deleting}
                aria-label="Remove"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form onSubmit={onAdd} className="space-y-4 rounded-md border border-border p-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" className={inputClass} defaultValue="LEAVE">
              <option value="LEAVE">Leave (time off)</option>
              <option value="BLOCK">Block a slot</option>
              <option value="EXTRA">Extra hours</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start</Label>
              <Input id="start" name="start" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End</Label>
              <Input id="end" name="end" type="datetime-local" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Public holiday" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="min-h-11">
              {pending ? "Adding…" : "Add"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
          <CalendarOff className="size-4" /> Add time off / block
        </Button>
      )}
    </div>
  );
}
