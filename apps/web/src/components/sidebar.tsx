"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { StaffRole } from "@light/shared-types";

export interface SidebarProps {
  role: StaffRole;
  onNavigate?: () => void;
  collapsed?: boolean;
}

/**
 * Role-accented navigation (D-05) with active-item highlight from the
 * current pathname (D-06). Used both in the fixed desktop rail and inside
 * the mobile Sheet drawer.
 */
export function Sidebar({ role, onNavigate, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const theme = ROLE_THEME[role];

  return (
    <div className="flex h-full flex-col">
      <div className={cn("h-1 w-full", theme.accentBar)} aria-hidden="true" />
      <div className="flex items-center gap-2 px-4 py-4">
        {!collapsed && (
          <span className={cn("text-sm font-semibold", theme.accentText)}>
            {theme.label}
          </span>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2" aria-label={`${theme.label} navigation`}>
        {theme.nav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isActive ? theme.navActive : "text-slate-600 hover:bg-slate-100",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
