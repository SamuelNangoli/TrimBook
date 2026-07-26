import type { Role } from "@prisma/client";

/**
 * Shared, framework-agnostic constants. Keep this file free of server-only
 * imports so it can be used on the client too.
 */

export const APP_NAME = "TrimBook";

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  OWNER: "/dashboard",
  BARBER: "/barber",
  CUSTOMER: "/account",
};

/** Route prefixes that require a specific role. Used by proxy + DAL. */
export const ROLE_ROUTE_PREFIXES: Record<string, Role> = {
  "/admin": "SUPER_ADMIN",
  "/dashboard": "OWNER",
  "/barber": "BARBER",
  "/account": "CUSTOMER",
};

/** Routes that are always public (no session required). */
export const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/register/shop",
  "/pricing",
  "/shops",
  "/contact",
];

/** Auth entry points; a signed-in user hitting these is bounced to their home. */
export const AUTH_ROUTES = ["/login", "/register", "/register/shop"];

export const SESSION_COOKIE = "authjs.session-token";
