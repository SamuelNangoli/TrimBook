"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cancelMyBookingAction } from "@/server/actions/my-booking.actions";
import { Button } from "@/components/ui/button";

export function CancelBookingButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onCancel() {
    if (!window.confirm("Cancel this booking?")) return;
    startTransition(async () => {
      const res = await cancelMyBookingAction(id);
      res.ok ? toast.success(res.message) : toast.error(res.message);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onCancel} disabled={pending}>
      {pending ? "Cancelling…" : "Cancel"}
    </Button>
  );
}
