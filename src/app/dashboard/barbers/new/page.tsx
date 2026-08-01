import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { createBarberAction } from "@/server/actions/barber.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarberForm } from "../barber-form";

export const metadata: Metadata = { title: "Add barber" };

export default async function NewBarberPage() {
  await requireShopContext();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/barbers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to barbers
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add barber</CardTitle>
          <CardDescription>
            Create the profile — set their working hours next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarberForm action={createBarberAction} submitLabel="Add barber" />
        </CardContent>
      </Card>
    </div>
  );
}
