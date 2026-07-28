"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateShopAction, type FormState } from "@/server/actions/shop.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/auth/field-error";

export type ShopFormData = {
  name: string;
  city: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export function SettingsForm({ shop }: { shop: ShopFormData }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateShopAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Saved.");
      router.refresh();
    } else if (state && !state.ok && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const errs = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Shop name</Label>
          <Input id="name" name="name" defaultValue={shop.name} required />
          <FieldError errors={errs?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={shop.city ?? ""} required />
          <FieldError errors={errs?.city} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={shop.description ?? ""}
          placeholder="Tell customers what makes your shop great."
        />
        <FieldError errors={errs?.description} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={shop.phone ?? ""} />
          <FieldError errors={errs?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={shop.email ?? ""} />
          <FieldError errors={errs?.email} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={shop.address ?? ""} />
        <FieldError errors={errs?.address} />
      </div>

      <Button type="submit" disabled={pending} className="min-h-11">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
