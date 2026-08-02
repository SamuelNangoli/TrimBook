import { requireRole } from "@/lib/dal";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarProvider } from "@/components/dashboard/sidebar-context";
import { SidebarToggle } from "@/components/dashboard/sidebar-toggle";
import { ADMIN_NAV } from "@/components/dashboard/nav-config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen flex-col">
        <AppTopbar role="Super Admin" name={user.name} leading={<SidebarToggle />} />
        <SidebarNav items={ADMIN_NAV} />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </SidebarProvider>
  );
}
