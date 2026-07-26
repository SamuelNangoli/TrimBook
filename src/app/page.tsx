import Link from "next/link";
import { Scissors, CalendarCheck, Users, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_HOME, APP_NAME } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Landing page. Phase 1 ships a clean hero + CTA; the full marketing page
 * (features, pricing, testimonials, FAQ) lands in a later phase.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const homeHref = user ? ROLE_HOME[user.role] : "/login";

  const features = [
    { icon: CalendarCheck, title: "Smart bookings", body: "Let customers book the right barber at the right time, 24/7." },
    { icon: Users, title: "Team management", body: "Manage barbers, services, availability and leave in one place." },
    { icon: CreditCard, title: "Mobile Money billing", body: "Get paid via MTN, Airtel and Flutterwave. UGX 25,000/month." },
  ];

  return (
    <main className="flex-1">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          {APP_NAME}
        </span>
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href={homeHref}>Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register/shop">Start free trial</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Built for barbershops in Uganda 🇺🇬
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          Run your barbershop like clockwork.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
          {APP_NAME} handles bookings, barbers, services and payments so you can
          focus on the fades. One dashboard, {formatCurrency(25000)} a month.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register/shop">Start your 14-day free trial</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Book as a customer</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-24 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-6 text-left">
            <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
