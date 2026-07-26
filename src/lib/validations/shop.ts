import { z } from "zod";

export const shopProfileSchema = z.object({
  name: z.string().min(2, { error: "Shop name is required." }).trim(),
  description: z
    .string()
    .max(500, { error: "Keep the description under 500 characters." })
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(7, { error: "Enter a valid phone number." })
    .optional()
    .or(z.literal("")),
  email: z
    .email({ error: "Enter a valid email." })
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().min(2, { error: "City is required." }).trim(),
});

export type ShopProfileInput = z.infer<typeof shopProfileSchema>;
