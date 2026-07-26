"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  registerShopAction,
  type FormState,
} from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldError } from "@/components/auth/field-error";

export function ShopRegisterForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerShopAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Your shop is live — enjoy your 14-day free trial!");
      router.push(state.redirectTo || "/dashboard");
      router.refresh();
    } else if (state && !state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ownerName">Your name</Label>
          <Input
            id="ownerName"
            name="ownerName"
            autoComplete="name"
            autoFocus
            placeholder="e.g. John Doe"
            required
          />
          <FieldError errors={fieldErrors?.ownerName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop name</Label>
          <Input
            id="shopName"
            name="shopName"
            placeholder="e.g. Fresh Cuts Barbershop"
            required
          />
          <FieldError errors={fieldErrors?.shopName} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <FieldError errors={fieldErrors?.email} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+256 7XX XXX XXX"
            required
          />
          <FieldError errors={fieldErrors?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="e.g. Kampala" required />
          <FieldError errors={fieldErrors?.city} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          required
        />
        <FieldError errors={fieldErrors?.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          required
        />
        <FieldError errors={fieldErrors?.confirmPassword} />
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? "Setting up your shop…" : "Start free trial"}
      </Button>
    </form>
  );
}
