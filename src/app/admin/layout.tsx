import { requireRole } from "@/lib/dal";
import { AppTopbar } from "@/components/app/app-topbar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { ADMIN_NAV } from "@/components/dashboard/nav-config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <div className="flex min-h-screen flex-col">
      <AppTopbar role="Super Admin" name={user.name} />
      <div className="mx-auto w-full max-w-7xl flex-1 lg:flex">
        <SidebarNav items={ADMIN_NAV} />
        <main className="min-w-0 flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
