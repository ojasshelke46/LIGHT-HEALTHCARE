/**
 * Appointment status -> badge label + color map (D-22).
 *
 * Classes are LITERAL Tailwind strings (never template-interpolated), same
 * rule as theme.ts, so the content scan keeps them in the production build.
 */

import type { AppointmentStatus } from "@light/shared-types";

export const APPOINTMENT_STATUS_BADGE: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  booked: { label: "Booked", className: "bg-slate-100 text-slate-700" },
  checked_in: { label: "Checked In", className: "bg-blue-100 text-blue-800" },
  in_consultation: {
    label: "In Consultation",
    className: "bg-yellow-100 text-yellow-800",
  },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
  no_show: { label: "No Show", className: "bg-red-100 text-red-800" },
  cancelled: {
    label: "Cancelled",
    className: "border border-slate-300 text-slate-500",
  },
};
