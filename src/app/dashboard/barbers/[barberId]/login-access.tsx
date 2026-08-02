"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, UserX } from "lucide-react";

import {
  createBarberLoginAction,
  revokeBarberLoginAction,
} from "@/server/actions/barber-login.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const router = useRouter();

  function run(fn: () => Promise<{ ok: boolean; message: string }>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    startTransition(async () => {
      const res = await fn();
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  if (hasLogin) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 text-success" />
          <span>
            Access enabled — signs in with <span className="font-medium">{loginEmail}</span> via
            Google or an email link.
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              () => revokeBarberLoginAction(barberId),
              "Revoke this barber's access? They won't be able to sign in.",
            )
          }
          className="text-muted-foreground hover:text-destructive"
        >
          <UserX className="size-4" /> Revoke access
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => createBarberLoginAction(barberId, fd));
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        Enter the barber&apos;s email to give them access. They&apos;ll sign in with Google or a
        magic link — no password needed — and see their appointments.
      </p>
      <div className="space-y-2">
        <Label htmlFor="login-email">Barber&apos;s email</Label>
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
      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Granting…" : "Grant access"}
      </Button>
    </form>
  );
}
