"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { loginAction, type FormState } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldError } from "@/components/auth/field-error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl || state.redirectTo || "/");
      router.refresh();
    } else if (state && !state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state, router, searchParams]);

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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          required
        />
        <FieldError errors={state && !state.ok ? state.fieldErrors?.email : undefined} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />
        <FieldError
          errors={state && !state.ok ? state.fieldErrors?.password : undefined}
        />
      </div>

      <Button type="submit" className="min-h-11 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
