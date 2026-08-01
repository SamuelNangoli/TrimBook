"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { FormState } from "@/server/actions/barber.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { FieldError } from "@/components/auth/field-error";

export type BarberDefaults = {
  name?: string;
  speciality?: string | null;
  bio?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  status?: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  isBookable?: boolean;
};

export function BarberForm({
  action,
  defaults,
  submitLabel,
  refreshOnSuccess,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults?: BarberDefaults;
  submitLabel: string;
  refreshOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [name, setName] = useState(defaults?.name ?? "");
  const [photo, setPhoto] = useState(defaults?.photoUrl ?? "");
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved.");
      if (refreshOnSuccess) router.refresh();
    } else if (state && !state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state, refreshOnSuccess, router]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} src={photo || null} className="size-16 text-lg" />
        <div className="flex-1 space-y-2">
          <Label htmlFor="photoUrl">Photo URL (optional)</Label>
          <Input
            id="photoUrl"
            name="photoUrl"
            type="url"
            inputMode="url"
            value={photo}
            onChange={(e) => setPhoto(e.target.value)}
            placeholder="https://…/photo.jpg"
          />
          <FieldError errors={errs?.photoUrl} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bruno Okello"
            required
          />
          <FieldError errors={errs?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="speciality">Speciality (optional)</Label>
          <Input
            id="speciality"
            name="speciality"
            defaultValue={defaults?.speciality ?? ""}
            placeholder="e.g. Fades & beard sculpting"
          />
          <FieldError errors={errs?.speciality} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ""} placeholder="+256 7XX XXX XXX" />
          <FieldError errors={errs?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} placeholder="barber@example.com" />
          <FieldError errors={errs?.email} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea id="bio" name="bio" defaultValue={defaults?.bio ?? ""} placeholder="A short intro shown to customers." />
        <FieldError errors={errs?.bio} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={defaults?.status ?? "ACTIVE"}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            name="isBookable"
            defaultChecked={defaults?.isBookable ?? true}
            className="size-4 rounded border-input"
          />
          Customers can book this barber
        </label>
      </div>

      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
