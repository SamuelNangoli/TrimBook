import { z } from "zod";
import { slugify } from "@/lib/utils";

/**
 * Zod schemas for auth flows. Shared between client forms and server actions so
 * validation rules never drift. (Zod v4 syntax.)
 */

export const emailSchema = z
  .email({ error: "Please enter a valid email address." })
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." })
  .max(72, { error: "Password must be at most 72 characters." })
  .regex(/[a-zA-Z]/, { error: "Include at least one letter." })
  .regex(/[0-9]/, { error: "Include at least one number." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Password is required." }),
});

/** Customer self-registration. */
export const registerSchema = z
  .object({
    name: z.string().min(2, { error: "Name must be at least 2 characters." }).trim(),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .min(7, { error: "Enter a valid phone number." })
      .optional()
      .or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Shop-owner onboarding (creates User + Shop + trial Subscription). */
export const shopRegisterSchema = z
  .object({
    ownerName: z
      .string()
      .min(2, { error: "Name must be at least 2 characters." })
      .trim(),
    shopName: z
      .string()
      .min(2, { error: "Shop name must be at least 2 characters." })
      .trim(),
    email: emailSchema,
    phone: z.string().trim().min(7, { error: "Enter a valid phone number." }),
    city: z.string().trim().min(2, { error: "City is required." }),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ShopRegisterInput = z.infer<typeof shopRegisterSchema>;

/** Derive a candidate slug from a shop name (uniqueness enforced in the service). */
export function shopNameToSlug(name: string): string {
  return slugify(name);
}
