"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { createShopAction, type FormState } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/auth/field-error";

export function StartShopForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createShopAction, null);

  useEffect(() => {
    if (state && !state.ok && state.message) toast.error(state.message);
  }, [state]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="shopName">Shop name</Label>
        <Input id="shopName" name="shopName" placeholder="e.g. Fresh Cuts Barbershop" autoFocus required />
        <FieldError errors={errs?.shopName} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="e.g. Kampala" required />
          <FieldError errors={errs?.city} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+256 7XX XXX XXX" required />
          <FieldError errors={errs?.phone} />
        </div>
      </div>
      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? "Creating your shop…" : "Start 14-day free trial"}
      </Button>
    </form>
  );
}
