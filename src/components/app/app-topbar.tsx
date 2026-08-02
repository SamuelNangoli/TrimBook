import Link from "next/link";
import { Scissors } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db/prisma";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { NotificationBell, type InboxItem } from "@/components/app/notification-bell";

/** Shared top bar for all authenticated role surfaces. */
export async function AppTopbar({
  role,
  name,
  leading,
}: {
  role: string;
  name?: string | null;
  /** Optional element rendered at the far left (e.g. the sidebar toggle). */
  leading?: React.ReactNode;
}) {
  const user = await getCurrentUser();
  let inbox: InboxItem[] = [];
  if (user) {
    const rows = await prisma.notification.findMany({
      where: { userId: user.id, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    inbox = rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
      read: n.status === "READ",
    }));
  }
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {leading}
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scissors className="size-4" />
            </span>
            {APP_NAME}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{name ?? "Account"}</p>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
          <NotificationBell items={inbox} />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
