import { z } from "zod";
import { slugify } from "@/lib/utils";

/**
 * Zod schemas for the passwordless auth flows. Shared between client forms and
 * server actions so validation rules never drift. (Zod v4 syntax.)
 */

export const emailSchema = z
  .email({ error: "Please enter a valid email address." })
  .trim()
  .toLowerCase();

/** Magic-link sign-in / sign-up: just an email. */
export const emailAuthSchema = z.object({
  email: emailSchema,
});

/** A signed-in user starting their barbershop (upgrades them to OWNER). */
export const startShopSchema = z.object({
  shopName: z.string().min(2, { error: "Shop name must be at least 2 characters." }).trim(),
  city: z.string().trim().min(2, { error: "City is required." }),
  phone: z.string().trim().min(7, { error: "Enter a valid phone number." }),
});

/** Manager invites a barber by email (creates a passwordless BARBER account). */
export const barberInviteSchema = z.object({
  email: emailSchema,
});

export type EmailAuthInput = z.infer<typeof emailAuthSchema>;
export type StartShopInput = z.infer<typeof startShopSchema>;

/** Derive a candidate slug from a shop name (uniqueness enforced in the service). */
export function shopNameToSlug(name: string): string {
  return slugify(name);
}
