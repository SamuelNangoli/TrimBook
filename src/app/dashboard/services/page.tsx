import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Scissors, Clock } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ServiceRowActions } from "./service-row-actions";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const { shopId, access } = await requireShopContext();

  const services = await prisma.service.findMany({
    where: { shopId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            The services customers can book, with prices and durations.
          </p>
        </div>
        <Button asChild disabled={!access.canManageResources}>
          <Link href="/dashboard/services/new">
            <Plus className="size-4" />
            New service
          </Link>
        </Button>
      </div>

      {!access.canManageResources && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Adding or editing services is paused until your subscription is active.
        </p>
      )}

      <Card>
        <CardContent className="p-0 sm:p-0">
          {services.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Scissors}
                title="No services yet"
                description="Add your first service so customers have something to book."
                action={
                  access.canManageResources ? (
                    <Button asChild>
                      <Link href="/dashboard/services/new">
                        <Plus className="size-4" /> New service
                      </Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      {s.category && (
                        <div className="text-xs text-muted-foreground">{s.category}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        {s.durationMinutes} min
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(s.price, s.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "ACTIVE" ? "success" : "secondary"}>
                        {s.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ServiceRowActions serviceId={s.id} isActive={s.status === "ACTIVE"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
