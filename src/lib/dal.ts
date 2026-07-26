import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ROLE_HOME } from "@/lib/constants";

/**
 * Data Access Layer (DAL).
 *
 * Centralizes every "who is the caller and are they allowed?" check. Server
 * Components, Server Actions and Route Handlers should get the current user
 * from here — never trust client input for identity, role, or shopId.
 *
 * Each function is wrapped in React's `cache` so repeated calls within a single
 * request/render don't re-run the work.
 */

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  shopId: string | null;
};

/** Raw Auth.js session (cached per request). */
export const getSession = cache(async () => auth());

/**
 * The current user derived from the signed session token. Fast (no DB call).
 * Returns null when unauthenticated.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    shopId: session.user.shopId,
  };
});

/** Require an authenticated user or redirect to /login. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

/**
 * Secure user load: reads the fresh row from the database and enforces
 * `isActive`. Use this for sensitive operations where a stale token
 * (e.g. a deactivated account) must not pass.
 */
export const getVerifiedUser = cache(async (): Promise<User | null> => {
  const session = await getCurrentUser();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return null;
  return user;
});

/**
 * Require one of the given roles. Redirects unauthenticated users to /login and
 * wrong-role users to their own home so they never see another role's surface.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(ROLE_HOME[user.role] ?? "/login");
  }
  return user;
}

/**
 * Require a staff user (OWNER or BARBER) bound to a shop, and return that
 * shopId. This is the entry point for all tenant-scoped work.
 */
export async function requireShopId(): Promise<{
  user: SessionUser;
  shopId: string;
}> {
  const user = await requireRole("OWNER", "BARBER");
  if (!user.shopId) {
    // Owner without a shop yet -> send them through onboarding.
    redirect("/register/shop");
  }
  return { user, shopId: user.shopId };
}

/** Convenience: true if the caller is the platform super admin. */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "SUPER_ADMIN";
}
