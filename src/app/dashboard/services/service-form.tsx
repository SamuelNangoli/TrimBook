"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import type { FormState } from "@/server/actions/service.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/auth/field-error";

export type ServiceDefaults = {
  name?: string;
  description?: string | null;
  price?: number;
  durationMinutes?: number;
  category?: string | null;
  status?: "ACTIVE" | "INACTIVE";
};

export function ServiceForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: ServiceDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);

  useEffect(() => {
    if (state && !state.ok && state.message) toast.error(state.message);
  }, [state]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Service name</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} placeholder="e.g. Haircut" required />
          <FieldError errors={errs?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category (optional)</Label>
          <Input id="category" name="category" defaultValue={defaults?.category ?? ""} placeholder="e.g. Grooming" />
          <FieldError errors={errs?.category} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (UGX)</Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0}
            step={500}
            inputMode="numeric"
            defaultValue={defaults?.price}
            placeholder="15000"
            required
          />
          <FieldError errors={errs?.price} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            max={600}
            step={5}
            inputMode="numeric"
            defaultValue={defaults?.durationMinutes ?? 30}
            placeholder="30"
            required
          />
          <FieldError errors={errs?.durationMinutes} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaults?.description ?? ""}
          placeholder="What's included in this service?"
        />
        <FieldError errors={errs?.description} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={defaults?.status ?? "ACTIVE"}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="ACTIVE">Active — bookable</option>
          <option value="INACTIVE">Inactive — hidden</option>
        </select>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="min-h-11">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
