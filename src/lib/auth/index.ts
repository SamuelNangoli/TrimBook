import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * Instantiated Auth.js. Import these helpers everywhere:
 *   - `auth()`   : read the session in RSC / route handlers / server actions
 *   - `signIn`   : credential sign-in (server action)
 *   - `signOut`  : sign out (server action)
 *   - `handlers` : GET/POST for the /api/auth/[...nextauth] route
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
