import { Suspense } from "react";
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
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your TrimBook account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-48" />}>
          <LoginForm />
        </Suspense>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
        <p>
          New customer?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          Own a barbershop?{" "}
          <Link href="/register/shop" className="font-medium text-foreground underline-offset-4 hover:underline">
            Start a free trial
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
