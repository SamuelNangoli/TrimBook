import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create your account" };

export default async function RegisterPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await props.searchParams;
  const callbackUrl =
    sp.callbackUrl && sp.callbackUrl.startsWith("/") && !sp.callbackUrl.startsWith("//")
      ? sp.callbackUrl
      : "/";
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Sign up with Google or your email — no password to remember.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
