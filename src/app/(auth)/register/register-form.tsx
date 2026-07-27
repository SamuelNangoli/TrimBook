"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  registerCustomerAction,
  type FormState,
} from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ValidatedInput } from "@/components/ui/validated-input";
import { PasswordField } from "@/components/ui/password-field";
import { FieldError } from "@/components/auth/field-error";
import { isEmail, isPhone, minLen } from "@/lib/validators";

export function RegisterForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerCustomerAction,
    null,
  );
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Account created. Welcome to TrimBook!");
      router.push(state.redirectTo || "/account");
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
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <ValidatedInput
          id="name"
          name="name"
          autoComplete="name"
          autoFocus
          placeholder="e.g. John Doe"
          validate={minLen(2)}
          required
        />
        <FieldError errors={fieldErrors?.name} />
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

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <ValidatedInput
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+256 7XX XXX XXX"
          validate={isPhone}
        />
        <FieldError errors={fieldErrors?.phone} />
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
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
