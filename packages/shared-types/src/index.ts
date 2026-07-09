/**
 * Shared TypeScript types across web + mobile.
 *
 * DB row types should be GENERATED from Supabase, not hand-written:
 *   pnpm --filter @light/shared-types gen:types
 * (see database.types.ts). Hand-maintained domain enums/helpers live here.
 */

export type StaffRole =
  | "reception"
  | "doctor"
  | "lab_tech"
  | "pharmacist"
  | "admin";

/** Landing route per role — mirrors the Next.js middleware. */
export const ROLE_HOME: Record<StaffRole, string> = {
  reception: "/reception",
  doctor: "/doctor",
  lab_tech: "/diagnostics",
  pharmacist: "/pharmacy",
  admin: "/admin",
};

export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "in_consult"
  | "completed"
  | "cancelled"
  | "no_show";

// Re-export generated Supabase types once produced.
export type { Database } from "./database.types";
