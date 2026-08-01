"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, CheckCircle2 } from "lucide-react";

import {
  createBarberLoginAction,
  resetBarberPasswordAction,
} from "@/server/actions/barber-login.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/ui/password-field";

export function LoginAccess({
  barberId,
  hasLogin,
  loginEmail,
  defaultEmail,
}: {
  barberId: string;
  hasLogin: boolean;
  loginEmail: string | null;
  defaultEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  function submit(fn: (fd: FormData) => Promise<{ ok: boolean; message: string }>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(async () => {
        const res = await fn(fd);
        if (res.ok) {
          toast.success(res.message);
          setResetting(false);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      });
    };
  }

  if (hasLogin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 text-success" />
          <span>
            Login enabled — signs in with{" "}
            <span className="font-medium">{loginEmail}</span>
          </span>
        </div>

        {resetting ? (
          <form onSubmit={submit((fd) => resetBarberPasswordAction(barberId, fd))} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <PasswordField
                id="reset-password"
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                requirements
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="min-h-11">
                {pending ? "Saving…" : "Set new password"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setResetting(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" onClick={() => setResetting(true)}>
            <KeyRound className="size-4" /> Reset password
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit((fd) => createBarberLoginAction(barberId, fd))} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Give this barber a login so they can sign in and see their appointments.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="login-email">Login email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={defaultEmail ?? ""}
            placeholder="barber@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <PasswordField
            id="login-password"
            name="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            requirements
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Creating…" : "Create login"}
      </Button>
    </form>
  );
}
