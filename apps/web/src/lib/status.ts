/**
 * Appointment status -> badge label + color map (D-22).
 *
 * Classes are LITERAL Tailwind strings (never template-interpolated), same
 * rule as theme.ts, so the content scan keeps them in the production build.
 */

import type { AppointmentStatus, Database } from "@light/shared-types";
import type { LucideIcon } from "lucide-react";
import { FlaskConical, ScanLine, Magnet, Image as ImageIcon } from "lucide-react";

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

/** Payment status -> badge label + color map (D-25, RECEP-06). */
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const PAYMENT_STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800" },
  refunded: {
    label: "Refunded",
    className: "border border-slate-300 text-slate-500",
  },
};

/** Diagnostics order status -> badge label + color map (D-33). */
export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  ordered: { label: "Ordered", className: "bg-slate-100 text-slate-700" },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800",
  },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
};

/** Pharmacy prescription status -> badge label + color map (D-38). */
export type PrescriptionStatus =
  Database["public"]["Enums"]["prescription_status"];

export const PRESCRIPTION_STATUS_BADGE: Record<
  PrescriptionStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
  dispensed: {
    label: "Dispensed",
    className: "bg-green-100 text-green-800",
  },
};

/** Diagnostics order type -> icon map (D-33). */
export type OrderType = Database["public"]["Enums"]["order_type"];

export const ORDER_TYPE_ICON: Record<OrderType, LucideIcon> = {
  lab: FlaskConical,
  ct: ScanLine,
  mri: Magnet,
  xray: ImageIcon,
};

/** Pharmacy stock indicator (D-38): insufficient / low / ok. */
export function stockLevel(
  stock: number,
  quantity: number,
  threshold: number,
): { level: "insufficient" | "low" | "ok"; label: string; className: string } {
  if (stock < quantity) {
    return {
      level: "insufficient",
      label: `Insufficient stock (have ${stock})`,
      className: "bg-red-100 text-red-800",
    };
  }
  if (stock <= threshold) {
    return {
      level: "low",
      label: "Low stock",
      className: "bg-amber-100 text-amber-800",
    };
  }
  return {
    level: "ok",
    label: `In stock (${stock})`,
    className: "bg-green-100 text-green-800",
  };
}
