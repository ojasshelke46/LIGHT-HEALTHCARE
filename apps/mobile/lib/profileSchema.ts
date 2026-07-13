import { z } from "zod";

/**
 * Editable subset of the `patients` row (D-54, MOB-05). `phone` is
 * deliberately absent — it is the Supabase Auth identity and stays
 * read-only, rendered but never included in this schema or any update
 * payload (T-04-12).
 */
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  address: z.string().trim().optional(),
  abha_id: z.string().trim().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
