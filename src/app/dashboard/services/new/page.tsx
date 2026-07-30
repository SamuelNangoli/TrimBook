import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { createServiceAction } from "@/server/actions/service.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage() {
  await requireShopContext();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/services"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to services
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New service</CardTitle>
          <CardDescription>Add a service customers can book.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm action={createServiceAction} submitLabel="Create service" />
        </CardContent>
      </Card>
    </div>
  );
}
