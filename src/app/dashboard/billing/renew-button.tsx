"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { renewNowAction } from "@/server/actions/billing.actions";
import { Button } from "@/components/ui/button";

export function RenewButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onRenew() {
    startTransition(async () => {
      const res = await renewNowAction();
      if (res.ok) {
        toast.success(res.message ?? "Subscription renewed.");
        router.refresh();
      } else {
        toast.error(res.message ?? "Renewal failed.");
      }
    });
  }

  return (
    <Button size="lg" onClick={onRenew} disabled={pending} className="min-h-11">
      <CreditCard className="size-4" />
      {pending ? "Processing…" : label}
    </Button>
  );
}
