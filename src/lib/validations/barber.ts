import { z } from "zod";

export const barberSchema = z.object({
  name: z.string().min(2, { error: "Barber name is required." }).trim(),
  speciality: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().max(500, { error: "Keep the bio under 500 characters." }).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email({ error: "Enter a valid email." }).optional().or(z.literal("")),
  // Accepts an http(s) URL or a compressed image data URL (from PhotoUpload).
  // Capped so an oversized image can't bloat the row / exceed the action limit.
  photoUrl: z
    .string()
    .trim()
    .max(900_000, { error: "Image is too large — try a smaller photo." })
    .refine((v) => v === "" || v.startsWith("data:image/") || /^https?:\/\//i.test(v), {
      error: "Invalid image.",
    })
    .optional()
    .or(z.literal("")),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]).default("ACTIVE"),
  isBookable: z.coerce.boolean().default(true),
});

export type BarberInput = z.infer<typeof barberSchema>;
