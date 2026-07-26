import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ROUTES,
  ROLE_ROUTE_PREFIXES,
  SESSION_COOKIE,
} from "@/lib/constants";

/**
 * Proxy (formerly "middleware" — renamed in Next.js 16, Node.js runtime).
 *
 * This performs only OPTIMISTIC checks: it looks at the presence of the session
 * cookie to bounce obviously-unauthenticated users away from protected areas,
 * and signed-in users away from the login/register pages. It deliberately does
 * NOT decode the token or hit the database on every request.
 *
 * Real authorization (role + tenant/shopId + subscription state) is enforced in
 * the Data Access Layer and server actions, close to the data. See src/lib/dal.ts.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never interfere with Auth.js's own endpoints.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.has(SESSION_COOKIE) ||
    req.cookies.has(`__Secure-${SESSION_COOKIE}`);

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Signed-in users shouldn't see login/register — send them home.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Protected role areas require *some* session; the DAL then checks the role.
  const protectedPrefix = Object.keys(ROLE_ROUTE_PREFIXES).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (protectedPrefix && !hasSession) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
