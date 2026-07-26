import Link from "next/link";
import { Scissors } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";

/** Shared top bar for all authenticated role surfaces. */
export function AppTopbar({
  role,
  name,
}: {
  role: string;
  name?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-4" />
          </span>
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{name ?? "Account"}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
