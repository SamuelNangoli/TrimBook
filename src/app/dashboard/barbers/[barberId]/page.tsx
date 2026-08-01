import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { DayOfWeek } from "@prisma/client";

import { requireShopContext } from "@/lib/shop-context";
import { prisma } from "@/lib/db/prisma";
import { updateBarberAction } from "@/server/actions/barber.actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarberForm } from "../barber-form";
import { WorkingHoursEditor, type DayHours } from "./working-hours-editor";
import { AvailabilityManager, type ExceptionRow } from "./availability-manager";
import { LoginAccess } from "./login-access";

export const metadata: Metadata = { title: "Manage barber" };

const ALL_DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export default async function ManageBarberPage(props: {
  params: Promise<{ barberId: string }>;
}) {
  const { shopId, shop } = await requireShopContext();
  const { barberId } = await props.params;

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, shopId },
    include: { user: { select: { email: true } } },
  });
  if (!barber) notFound();

  const [hours, exceptions] = await Promise.all([
    prisma.workingHours.findMany({ where: { shopId, barberId } }),
    prisma.availability.findMany({
      where: { shopId, barberId, endTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Build the 7-day map, defaulting missing days to 09:00–18:00 open.
  const hoursByDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const initialHours = Object.fromEntries(
    ALL_DAYS.map((day): [DayOfWeek, DayHours] => {
      const h = hoursByDay.get(day);
      return [
        day,
        {
          dayOfWeek: day,
          isClosed: h ? h.isClosed : day === "SUNDAY",
          start: minutesToHHMM(h?.startMinutes ?? 540),
          end: minutesToHHMM(h?.endMinutes ?? 1080),
        },
      ];
    }),
  ) as Record<DayOfWeek, DayHours>;

  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: shop.timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const exceptionRows: ExceptionRow[] = exceptions.map((ex) => ({
    id: ex.id,
    type: ex.type,
    startLabel: fmt.format(ex.startTime),
    endLabel: fmt.format(ex.endTime),
    reason: ex.reason,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/barbers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to barbers
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{barber.name}</h1>
        <p className="text-sm text-muted-foreground">
          {barber.speciality ?? "Manage profile, working hours and time off."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Details customers see when booking.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarberForm
            action={updateBarberAction.bind(null, barberId)}
            submitLabel="Save profile"
            refreshOnSuccess
            defaults={{
              name: barber.name,
              speciality: barber.speciality,
              bio: barber.bio,
              phone: barber.phone,
              email: barber.email,
              photoUrl: barber.photoUrl,
              status: barber.status,
              isBookable: barber.isBookable,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login access</CardTitle>
          <CardDescription>Let this barber sign in to view their appointments.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginAccess
            barberId={barberId}
            hasLogin={!!barber.userId}
            loginEmail={barber.user?.email ?? null}
            defaultEmail={barber.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working hours</CardTitle>
          <CardDescription>
            Weekly schedule. These drive which slots customers can book.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkingHoursEditor barberId={barberId} initial={initialHours} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time off &amp; exceptions</CardTitle>
          <CardDescription>
            Leave, one-off blocks, or extra hours outside the weekly schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AvailabilityManager barberId={barberId} exceptions={exceptionRows} />
        </CardContent>
      </Card>
    </div>
  );
}
