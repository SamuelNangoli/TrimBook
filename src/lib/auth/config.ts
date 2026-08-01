import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Strategy: JWT sessions. We embed `id`, `role` and `shopId` in the token so
 * that authorization and tenant-scoping checks never need a database round-trip
 * for the common case. The database remains the source of truth for secure
 * checks in the Data Access Layer (see src/lib/dal.ts).
 */
export const authConfig = {
  // Trust the incoming request's host for callback/redirect URLs. This keeps
  // auth working on any deployment domain even if AUTH_URL is unset or stale,
  // so logout/login never bounce to the wrong host (e.g. localhost).
  trustHost: true,

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        // Validate shape before touching the database.
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.isActive) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // Best-effort login timestamp; never block sign-in on this.
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => undefined);

        // The returned object becomes `user` in the jwt callback.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          shopId: user.shopId,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in, copy custom claims onto the token.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.shopId = user.shopId;
      }

      // Allow the session to be refreshed (e.g. after a shop is created for an
      // owner, or a role changes) via `update()` on the client.
      if (trigger === "update" && session) {
        if (typeof session.shopId !== "undefined") {
          token.shopId = session.shopId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // The jwt callback above guarantees these claims are present. Casts are
      // needed because Auth.js v5 re-exports the JWT interface, so our module
      // augmentation of `next-auth/jwt` doesn't always merge into it.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.shopId = (token.shopId ?? null) as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
