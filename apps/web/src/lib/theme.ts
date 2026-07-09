/**
 * Single source of truth for role-scoped visual accents and navigation.
 *
 * Classes are LITERAL Tailwind strings (not template-interpolated) so the
 * content scan in tailwind.config.ts keeps them — a dynamic `bg-${x}` would
 * be purged from the production build.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutList,
  Stethoscope,
  FlaskConical,
  Pill,
  LayoutDashboard,
} from "lucide-react";
import type { StaffRole } from "@light/shared-types";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export type RoleTheme = {
  label: string; // portal name shown in header
  navActive: string; // active sidebar item classes
  accentBar: string; // header/sidebar accent bar bg
  accentText: string; // accent text color
  badge: string; // role badge classes
  nav: NavItem[];
};

export const ROLE_THEME: Record<StaffRole, RoleTheme> = {
  reception: {
    label: "Reception",
    navActive: "bg-blue-50 text-blue-700",
    accentBar: "bg-blue-600",
    accentText: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    nav: [{ href: "/reception", label: "Queue", icon: LayoutList }],
  },
  doctor: {
    label: "Doctor",
    navActive: "bg-purple-50 text-purple-700",
    accentBar: "bg-purple-600",
    accentText: "text-purple-700",
    badge: "bg-purple-100 text-purple-800",
    nav: [{ href: "/doctor", label: "Patients", icon: Stethoscope }],
  },
  lab_tech: {
    label: "Diagnostics",
    navActive: "bg-amber-50 text-amber-700",
    accentBar: "bg-amber-500",
    accentText: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    nav: [{ href: "/diagnostics", label: "Orders", icon: FlaskConical }],
  },
  pharmacist: {
    label: "Pharmacy",
    navActive: "bg-green-50 text-green-700",
    accentBar: "bg-green-600",
    accentText: "text-green-700",
    badge: "bg-green-100 text-green-800",
    nav: [{ href: "/pharmacy", label: "Prescriptions", icon: Pill }],
  },
  admin: {
    label: "Admin",
    navActive: "bg-gray-100 text-gray-800",
    accentBar: "bg-gray-600",
    accentText: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
    nav: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
};
