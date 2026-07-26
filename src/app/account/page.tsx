import type { Metadata } from "next";

import { requireRole } from "@/lib/dal";
import { AppTopbar } from "@/components/app/app-topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireRole("CUSTOMER");

  return (
    <>
      <AppTopbar role="Customer" name={user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome, {user.name}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>Coming in Phase 5</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Browse barbershops, book appointments and see your booking history
            here. Your account is ready.
          </CardContent>
        </Card>
      </main>
    </>
  );
}
