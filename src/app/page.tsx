import Link from "next/link";
import type { Metadata } from "next";
import {
  Scissors,
  Search,
  MapPin,
  CalendarCheck,
  Clock,
  BellRing,
  UserCheck,
  Star,
  Store,
  CreditCard,
  ShieldCheck,
  ArrowRight,
  Check,
  Users,
  Sparkles,
} from "lucide-react";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/dal";
import { ROLE_HOME, APP_NAME } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/app/theme-toggle";

export const metadata: Metadata = {
  title: "TrimBook — Book your next haircut in seconds",
  description:
    "Find a great barbershop near you, pick your barber and time, and book instantly. Free for customers.",
};

const STEPS = [
  { icon: Search, title: "Find a shop", body: "Browse barbershops near you and see their services, barbers and prices." },
  { icon: UserCheck, title: "Pick barber & time", body: "Choose your favourite barber and an open slot that suits you." },
  { icon: CalendarCheck, title: "Book & relax", body: "Confirm in seconds and get reminders so you never miss your slot." },
];

const CUSTOMER_FEATURES = [
  { icon: Clock, title: "Real-time availability", body: "Only ever see times that are actually open — no back-and-forth calls." },
  { icon: UserCheck, title: "Choose your barber", body: "Book the barber who knows your cut, every single time." },
  { icon: BellRing, title: "Handy reminders", body: "Get a nudge 24 hours and 2 hours before your appointment." },
  { icon: CalendarCheck, title: "Your booking history", body: "See upcoming and past visits, and cancel in a tap if plans change." },
];

const TESTIMONIALS = [
  { quote: "Booked a fade on my lunch break in under a minute. No more waiting around the shop.", name: "Brian", city: "Kampala" },
  { quote: "I always get my usual barber now — the reminders mean I never miss my slot.", name: "Aisha", city: "Entebbe" },
  { quote: "Setup took an afternoon and our chairs are fuller. Customers love booking online.", name: "Fresh Cuts", city: "Shop owner" },
];

const FAQS = [
  { q: "Is booking free for customers?", a: "Yes — booking a barbershop on TrimBook is completely free. You only pay the shop for your service, as usual." },
  { q: "Do I need an account to book?", a: "You can browse freely. To confirm a booking you'll sign in so we can send confirmations and reminders and keep your history." },
  { q: "Can I cancel a booking?", a: "Yes. Open “My bookings”, find the appointment and cancel it — ideally a little ahead so the shop can free up the slot." },
  { q: "I own a barbershop — how do I list it?", a: "Start a 14-day free trial, add your services and barbers, set your hours, and your public booking page goes live instantly." },
  { q: "How do shops get paid?", a: "Customers pay in person for now. Online Mobile Money payments (MTN, Airtel, Flutterwave) are coming soon." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const homeHref = user ? (ROLE_HOME[user.role] ?? "/account") : "/login";

  // Real, bookable barbershops for the "featured" section + live stats.
  const bookableWhere: Prisma.ShopWhereInput = {
    status: "ACTIVE",
    subscription: { is: { status: { in: ["TRIAL", "ACTIVE"] } } },
    services: { some: { status: "ACTIVE" } },
    barbers: { some: { status: "ACTIVE", isBookable: true } },
  };

  const [featured, shopCount, barberCount] = await Promise.all([
    prisma.shop.findMany({
      where: bookableWhere,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        city: true,
        _count: {
          select: {
            services: { where: { status: "ACTIVE" } },
            barbers: { where: { status: "ACTIVE", isBookable: true } },
          },
        },
      },
    }),
    prisma.shop.count({ where: bookableWhere }),
    prisma.barber.count({ where: { status: "ACTIVE", isBookable: true } }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="size-4" />
            </span>
            {APP_NAME}
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="#how-it-works">How it works</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/shops">Browse shops</Link>
            </Button>
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm">
                <Link href={homeHref}>{user.role === "CUSTOMER" ? "My bookings" : "Dashboard"}</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5" /> Barbershop booking, made simple
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Book a great barber, <span className="text-primary">skip the wait.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Find a barbershop near you, pick your barber and time, and book in seconds.
            Free for customers.
          </p>

          {/* Search */}
          <form
            action="/shops"
            className="mx-auto mt-8 flex max-w-md items-center gap-2"
            role="search"
          >
            <label htmlFor="q" className="sr-only">
              Search barbershops by name or city
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="q"
                name="q"
                placeholder="Search shop or city…"
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" size="lg" className="min-h-11 shrink-0">
              Find a barber
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-success" /> No booking fees
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 text-success" /> Real-time availability
            </span>
            <span className="inline-flex items-center gap-1">
              <BellRing className="size-3.5 text-success" /> Free reminders
            </span>
          </div>
        </section>

        {/* Stats band */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-4 px-4 py-8 text-center">
            <div>
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">{shopCount}+</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Barbershops</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">{barberCount}+</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Barbers ready to book</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">24/7</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">Book anytime</div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Book in three easy steps</h2>
            <p className="mt-3 text-muted-foreground">From “I need a trim” to booked in under a minute.</p>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-xl border border-border bg-card p-6">
                <span className="absolute right-5 top-5 text-sm font-semibold text-muted-foreground/50">
                  0{i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <step.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Featured shops (real data) */}
        {featured.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Popular barbershops</h2>
                <p className="mt-2 text-muted-foreground">Fresh cuts near you, ready to book.</p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/shops">
                  See all <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((shop) => (
                <Link key={shop.id} href={`/shops/${shop.slug}`} className="group">
                  <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors group-hover:border-primary/50">
                    <div className="flex items-center gap-3">
                      <Avatar name={shop.name} className="size-11" />
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold group-hover:text-primary">{shop.name}</h3>
                        {shop.city && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {shop.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {shop.description && (
                      <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{shop.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Scissors className="size-3.5" /> {shop._count.services} services
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" /> {shop._count.barbers} barbers
                      </span>
                      <span className="ml-auto font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                        Book →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Why customers love it */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to look sharp</h2>
              <p className="mt-3 text-muted-foreground">Booking should be the easy part. Here&apos;s what you get.</p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {CUSTOMER_FEATURES.map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-background p-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Loved by customers &amp; barbershops</h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                <div className="flex gap-0.5 text-primary" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-medium">
                  {t.name} <span className="text-muted-foreground">· {t.city}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* For barbershop owners */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:pb-20">
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium">
                  <Store className="size-3.5" /> For barbershop owners
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Run your shop like clockwork
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Take bookings 24/7, manage barbers and services, track revenue and get a
                  public booking page — all from one dashboard.
                </p>
                <ul className="mt-5 grid gap-2 text-sm">
                  {["Online bookings & reminders", "Barber schedules & leave", "Reports & customer history", "Mobile Money billing (soon)"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="size-4 text-success" /> {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>

              {/* Pricing card */}
              <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{formatCurrency(25000)}</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Starter plan · 14-day free trial</p>
                <div className="my-5 h-px bg-border" />
                <ul className="grid gap-2 text-sm">
                  {["Unlimited bookings", "Unlimited barbers & services", "Public booking page", "Automated reminders"].map(
                    (item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="size-4 text-success" /> {item}
                      </li>
                    ),
                  )}
                </ul>
                <Button asChild size="lg" className="mt-6 min-h-11 w-full">
                  <Link href="/register/shop">
                    <CreditCard className="size-4" /> Start free trial
                  </Link>
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">No card required.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto w-full max-w-3xl px-4 pb-16 sm:pb-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked questions</h2>
          </div>
          <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium">
                  {faq.q}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="pb-4 text-sm text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="rounded-2xl border border-border bg-primary p-10 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready for a fresh cut?</h2>
            <p className="mx-auto mt-3 max-w-md text-primary-foreground/80">
              Find your barbershop and book in seconds — or list your shop and fill your chairs.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="min-h-11">
                <Link href="/shops">Find a barbershop</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href="/register/shop">List your barbershop</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Scissors className="size-3.5" />
            </span>
            © {new Date().getFullYear()} {APP_NAME}
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/shops" className="hover:text-foreground">Browse shops</Link>
            <Link href="/register/shop" className="hover:text-foreground">For barbershops</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="#how-it-works" className="hover:text-foreground">How it works</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
