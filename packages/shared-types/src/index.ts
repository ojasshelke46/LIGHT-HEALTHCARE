/**
 * Shared TypeScript types across web + mobile.
 *
 * DB row types should be GENERATED from Supabase, not hand-written:
 *   pnpm --filter @light/shared-types gen:types
 * (see database.types.ts). Hand-maintained domain enums/helpers live here.
 */

import type { Database } from "./database.types";

/** Derived from the generated Database enums — never hand-write these unions. */
export type StaffRole = Database["public"]["Enums"]["staff_role"];

/** Landing route per role — mirrors the Next.js middleware. */
export const ROLE_HOME: Record<StaffRole, string> = {
  reception: "/reception",
  doctor: "/doctor",
  lab_tech: "/diagnostics",
  pharmacist: "/pharmacy",
  admin: "/admin",
};

export type AppointmentStatus =
  Database["public"]["Enums"]["appointment_status"];

// Re-export generated Supabase types once produced.
export type { Database } from "./database.types";
