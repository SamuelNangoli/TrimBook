import Link from "next/link";
import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage(props: {
  searchParams: Promise<{ callbackUrl?: string; check?: string }>;
}) {
  const sp = await props.searchParams;
  const callbackUrl =
    sp.callbackUrl && sp.callbackUrl.startsWith("/") && !sp.callbackUrl.startsWith("//")
      ? sp.callbackUrl
      : "/";
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  if (sp.check === "email") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>Your secure sign-in link is on its way.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 py-2 text-center">
          <MailCheck className="mx-auto size-10 text-success" />
          <p className="text-sm text-muted-foreground">
            Click the link in the email to finish signing in. You can close this tab.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="text-sm text-foreground underline-offset-4 hover:underline">
            Use a different email
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome to TrimBook</CardTitle>
        <CardDescription>Sign in or create your account — no password needed.</CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Own a barbershop?{" "}
          <Link
            href="/register/shop"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Start a free trial
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
