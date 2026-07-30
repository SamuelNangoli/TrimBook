"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createBookingAction,
  getSlotsAction,
  type CreateBookingState,
  type SlotDTO,
} from "@/server/actions/booking.actions";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  currency: string;
};
type Barber = { id: string; name: string };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewBookingForm({
  services,
  barbers,
  todayStr,
}: {
  services: Service[];
  barbers: Barber[];
  todayStr: string;
}) {
  const [state, action, submitting] = useActionState<CreateBookingState, FormData>(
    createBookingAction,
    null,
  );

  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [dateStr, setDateStr] = useState(todayStr);
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, startLoading] = useTransition();

  // Load slots whenever service, barber or date changes.
  useEffect(() => {
    if (!serviceId || !barberId || !dateStr) return;
    setSelected("");
    startLoading(async () => {
      const result = await getSlotsAction({ serviceId, barberId, dateStr });
      setSlots(result);
    });
  }, [serviceId, barberId, dateStr]);

  useEffect(() => {
    if (state && !state.ok) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      {/* Customer */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer name</Label>
          <Input id="customerName" name="customerName" placeholder="e.g. John Doe" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone (optional)</Label>
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            inputMode="tel"
            placeholder="+256 7XX XXX XXX"
          />
        </div>
      </div>

      {/* Service + barber */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serviceId">Service</Label>
          <select
            id="serviceId"
            name="serviceId"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={selectClass}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMinutes}m · {formatCurrency(s.price, s.currency)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="barberId">Barber</Label>
          <select
            id="barberId"
            name="barberId"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
            className={selectClass}
          >
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          min={todayStr}
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="w-full sm:w-56"
        />
      </div>

      {/* Slots */}
      <div className="space-y-2">
        <Label>Available times</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Finding available slots…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open slots for this barber on this day. Try another date or barber.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.startISO}
                type="button"
                onClick={() => setSelected(slot.startISO)}
                aria-pressed={selected === slot.startISO}
                className={cn(
                  "min-h-9 rounded-md border px-3 text-sm transition-colors",
                  selected === slot.startISO
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-accent",
                )}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" placeholder="Anything the barber should know?" />
      </div>

      <input type="hidden" name="startISO" value={selected} />

      <Button type="submit" disabled={submitting || !selected} className="min-h-11">
        {submitting ? "Booking…" : "Create booking"}
      </Button>
      {!selected && slots.length > 0 && (
        <p className="text-xs text-muted-foreground">Pick a time slot to continue.</p>
      )}
    </form>
  );
}
