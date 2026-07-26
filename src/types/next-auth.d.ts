import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Augment Auth.js types so `role` and `shopId` are available on the session and
 * JWT everywhere. `shopId` is the tenant key: it is present for OWNER/BARBER and
 * null for SUPER_ADMIN/CUSTOMER.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      shopId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    shopId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    shopId: string | null;
  }
}
