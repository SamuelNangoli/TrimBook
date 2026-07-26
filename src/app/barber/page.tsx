import type { Metadata } from "next";

import { requireRole } from "@/lib/dal";
import { AppTopbar } from "@/components/app/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My day" };

export default async function BarberPage() {
  const user = await requireRole("BARBER");

  return (
    <>
      <AppTopbar role="Barber" name={user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s appointments</h1>
        <Card>
          <CardHeader>
            <CardTitle>Coming in Phase 4</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You&apos;ll see today&apos;s schedule here and be able to mark customers
            arrived, completed or absent, and manage your availability.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
