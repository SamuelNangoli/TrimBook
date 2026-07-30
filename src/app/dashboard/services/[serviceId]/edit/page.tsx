import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { updateServiceAction } from "@/server/actions/service.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceForm } from "../../service-form";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage(props: {
  params: Promise<{ serviceId: string }>;
}) {
  const { shopId } = await requireShopContext();
  const { serviceId } = await props.params;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!service) notFound();

  // Bind the service id so the form action keeps the (state, formData) shape.
  const action = updateServiceAction.bind(null, serviceId);

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
          <CardTitle>Edit service</CardTitle>
          <CardDescription>Update pricing, duration or availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm
            action={action}
            submitLabel="Save changes"
            defaults={{
              name: service.name,
              description: service.description,
              price: service.price,
              durationMinutes: service.durationMinutes,
              category: service.category,
              status: service.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
