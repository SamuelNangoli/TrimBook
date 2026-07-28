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
import { ShopRegisterForm } from "./shop-register-form";


export const metadata: Metadata = { title: "Start your barbershop" };


export default function ShopRegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Start your barbershop</CardTitle>
        <CardDescription>
          14-day free trial. No card required. UGX 25,000/month after.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ShopRegisterForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

