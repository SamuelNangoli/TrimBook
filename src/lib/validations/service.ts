import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, { error: "Service name is required." }).trim(),
  description: z
    .string()
    .max(500, { error: "Keep the description under 500 characters." })
    .optional()
    .or(z.literal("")),
  price: z.coerce
    .number({ error: "Enter a price." })
    .int()
    .min(0, { error: "Price can't be negative." }),
  durationMinutes: z.coerce
    .number({ error: "Enter a duration." })
    .int()
    .min(5, { error: "Minimum 5 minutes." })
    .max(600, { error: "Maximum 10 hours." }),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
