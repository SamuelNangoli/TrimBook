"use client";

import { useActionState } from "react";
import { Mail, MailCheck } from "lucide-react";

import {
  signInWithGoogleAction,
  signInWithEmailAction,
  type FormState,
} from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/auth/field-error";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function AuthForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    signInWithEmailAction,
    null,
  );

  // After sending, Auth.js redirects to the verify page — but if the action
  // returns ok (edge cases), show the confirmation inline too.
  if (state?.ok) {
    return (
      <div className="space-y-3 py-4 text-center">
        <MailCheck className="mx-auto size-10 text-success" />
        <div>
          <p className="font-medium">Check your email</p>
          <p className="text-sm text-muted-foreground">
            We sent you a secure sign-in link. Click it to continue.
          </p>
        </div>
      </div>
    );
  }

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const generalError = state && !state.ok ? state.message : undefined;

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <form action={signInWithGoogleAction}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <Button type="submit" variant="outline" className="min-h-11 w-full">
            <GoogleIcon />
            Continue with Google
          </Button>
        </form>
      )}

      {googleEnabled && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or with email
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      <form action={action} className="space-y-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
          <FieldError errors={fieldErrors?.email} />
        </div>
        <Button type="submit" className="min-h-11 w-full" disabled={pending}>
          <Mail className="size-4" />
          {pending ? "Sending link…" : "Email me a sign-in link"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll email you a secure link — no password needed.
      </p>
    </div>
  );
}
