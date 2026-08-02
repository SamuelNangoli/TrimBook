"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  registerShopAction,
  type FormState,
} from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { PasswordField } from "@/components/ui/password-field";
import { FieldError } from "@/components/auth/field-error";
import { isEmail, isPhone, minLen } from "@/lib/validators";

export function ShopRegisterForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerShopAction,
    null,
  );
  const [password, setPassword] = useState("");

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
  const generalError = state && !state.ok ? state.message : undefined;

  return (
    <form action={action} className="space-y-4">
      {generalError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {generalError}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ownerName">Your name</Label>
          <ValidatedInput
            id="ownerName"
            name="ownerName"
            autoComplete="name"
            autoFocus
            placeholder="e.g. John Doe"
            validate={minLen(2)}
            required
          />
          <FieldError errors={fieldErrors?.ownerName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop name</Label>
          <ValidatedInput
            id="shopName"
            name="shopName"
            placeholder="e.g. Fresh Cuts Barbershop"
            validate={minLen(2)}
            required
          />
          <FieldError errors={fieldErrors?.shopName} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <ValidatedInput
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          validate={isEmail}
          required
        />
        <FieldError errors={fieldErrors?.email} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <ValidatedInput
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+256 7XX XXX XXX"
            validate={isPhone}
            required
          />
          <FieldError errors={fieldErrors?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <ValidatedInput
            id="city"
            name="city"
            placeholder="e.g. Kampala"
            validate={minLen(2)}
            required
          />
          <FieldError errors={fieldErrors?.city} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          requirements
          onValueChange={setPassword}
          required
        />
        <FieldError errors={fieldErrors?.password} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          match={password}
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
