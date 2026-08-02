import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

import { prisma } from "@/lib/db/prisma";

/**
 * Auth.js (NextAuth v5) — PASSWORDLESS.
 *
 * Sign-in is via Google OAuth and email magic links (no passwords). The Prisma
 * adapter persists users, OAuth accounts and magic-link verification tokens.
 * Sessions stay JWT so our DAL/proxy can read `role`/`shopId` from the token
 * without a DB round-trip on every request.
 *
 * Env:
 *   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET  -> enables the Google button
 *   AUTH_RESEND_KEY / EMAIL_FROM         -> real magic-link emails (else the
 *                                           link is logged to the server console
 *                                           in dev so you can still sign in)
 */

// Wrap the adapter so magic-link sign-ups (which carry no name) still satisfy
// our required `User.name` — fall back to the email's local part.
const base = PrismaAdapter(prisma);
const adapter: typeof base = {
  ...base,
  createUser: (data) =>
    base.createUser!({
      ...data,
      name: data.name ?? data.email?.split("@")[0] ?? "New user",
    }),
};

const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Trust Google's verified email so the same person can also use a magic
      // link (and match a barber account pre-created by their manager).
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

providers.push(
  Resend({
    apiKey: process.env.AUTH_RESEND_KEY ?? "re_dev_placeholder",
    from: process.env.EMAIL_FROM ?? "TrimBook <onboarding@resend.dev>",
    async sendVerificationRequest({ identifier: email, url }) {
      const key = process.env.AUTH_RESEND_KEY;
      if (!key) {
        // No email provider configured (dev) — log the link so you can sign in.
        console.log(`\n🔗 [magic-link] Sign-in link for ${email}:\n${url}\n`);
        return;
      }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? "TrimBook <onboarding@resend.dev>",
          to: email,
          subject: "Your TrimBook sign-in link",
          html: `<p>Click below to sign in to TrimBook:</p><p><a href="${url}">Sign in to TrimBook</a></p><p>This link expires shortly. If you didn't request it, you can ignore this email.</p>`,
        }),
      });
      if (!res.ok) {
        throw new Error(`Resend delivery failed: ${await res.text()}`);
      }
    },
  }),
);

export const authConfig = {
  adapter,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=email",
  },
  providers,

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On sign-in, copy custom claims from the (adapter) user onto the token.
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
        token.shopId = (user as { shopId?: string | null }).shopId ?? null;
      }

      // Allow role/shop to be refreshed after onboarding (e.g. a customer
      // starts a shop and becomes an OWNER) via unstable_update().
      if (trigger === "update" && session) {
        if (typeof session.role !== "undefined") token.role = session.role;
        if (typeof session.shopId !== "undefined") token.shopId = session.shopId;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.shopId = (token.shopId ?? null) as string | null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
