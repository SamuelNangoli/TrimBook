import Link from "next/link";
import { Scissors } from "lucide-react";

import { getCurrentUser } from "@/lib/dal";
import { ROLE_HOME } from "@/lib/constants";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";

/** Header for public / customer-facing pages. */
export async function PublicHeader() {
  const user = await getCurrentUser();
  const home = user ? (ROLE_HOME[user.role] ?? "/account") : null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          TrimBook
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/shops">Browse shops</Link>
          </Button>
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm">
              <Link href={home!}>{user.role === "CUSTOMER" ? "My bookings" : "Dashboard"}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
