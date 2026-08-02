import { getShopContext } from "@/lib/shop-context";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { SidebarToggle } from "@/components/dashboard/sidebar-toggle";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { OWNER_NAV } from "@/components/dashboard/nav-config";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Loads shop + subscription + access (cached for the whole request). Does not
  // hard-redirect here — individual pages decide via requireShopContext().
  const ctx = await getShopContext();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <AppTopbar role="Shop Owner" name={ctx.userName} leading={<SidebarToggle />} />
        <SidebarNav items={OWNER_NAV} />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">
          <SubscriptionBanner access={ctx.access} subscription={ctx.subscription} />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
