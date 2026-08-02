import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/dal";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { StartShopForm } from "./start-shop-form";

export const metadata: Metadata = { title: "Start your barbershop" };

export default async function StartShopPage() {
  const user = await getCurrentUser();

  // Already a shop owner/staff? Send them to their dashboard.
  if (user && user.shopId) redirect("/dashboard");

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Start your barbershop</CardTitle>
        <CardDescription>
          {user
            ? "Tell us about your shop to begin your 14-day free trial."
            : "First, sign in or create your account — then set up your shop."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <StartShopForm />
        ) : (
          <AuthForm googleEnabled={googleEnabled} callbackUrl="/register/shop" />
        )}
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Just want to book a cut?{" "}
          <Link href="/shops" className="font-medium text-foreground underline-offset-4 hover:underline">
            Browse barbershops
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
