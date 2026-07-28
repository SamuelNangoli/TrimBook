import type { Metadata } from "next";

import { requireShopContext } from "@/lib/shop-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  // Settings stay reachable even when the account is locked.
  const { shop } = await requireShopContext({ allowLocked: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shop settings</h1>
        <p className="text-sm text-muted-foreground">
          Your public profile at{" "}
          <span className="font-mono text-foreground">/shops/{shop.slug}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            This information appears on your public booking page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            shop={{
              name: shop.name,
              city: shop.city ?? null,
              description: shop.description ?? null,
              phone: shop.phone ?? null,
              email: shop.email ?? null,
              address: shop.address ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
