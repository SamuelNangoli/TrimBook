import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
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
import { BarberRowActions } from "./barber-row-actions";

export const metadata: Metadata = { title: "Barbers" };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "secondary" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  ON_LEAVE: { label: "On leave", variant: "warning" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
};

export default async function BarbersPage() {
  const { shopId, access } = await requireShopContext();

  const barbers = await prisma.barber.findMany({
    where: { shopId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { appointments: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barbers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team, their schedules and availability.
          </p>
        </div>
        <Button asChild disabled={!access.canManageResources}>
          <Link href="/dashboard/barbers/new">
            <Plus className="size-4" />
            Add barber
          </Link>
        </Button>
      </div>

      {!access.canManageResources && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Adding or editing barbers is paused until your subscription is active.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {barbers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No barbers yet"
                description="Add your first barber so customers can book with them."
                action={
                  access.canManageResources ? (
                    <Button asChild>
                      <Link href="/dashboard/barbers/new">
                        <Plus className="size-4" /> Add barber
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
                  <TableHead>Barber</TableHead>
                  <TableHead>Speciality</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Bookable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barbers.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Link href={`/dashboard/barbers/${b.id}`} className="flex items-center gap-3">
                        <Avatar name={b.name} src={b.photoUrl} />
                        <span className="font-medium hover:underline">{b.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {b.speciality ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{b._count.appointments}</TableCell>
                    <TableCell>
                      <Badge variant={b.isBookable ? "success" : "secondary"}>
                        {b.isBookable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS[b.status].variant}>{STATUS[b.status].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <BarberRowActions barberId={b.id} isBookable={b.isBookable} />
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
