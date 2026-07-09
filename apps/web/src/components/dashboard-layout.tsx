"use client";

/**
 * Async-state convention (D-13), documented here as the single source of
 * truth for every later client realtime view:
 *
 * Client realtime views own their { data, error, loading } state: skeleton
 * rows while loading, a destructive-toned retry block on error, a friendly
 * empty state with icon when there are no rows. Server routes use
 * loading.tsx + error.tsx.
 */

import { useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { ROLE_THEME } from "@/lib/theme";
import type { StaffIdentity } from "@/lib/staff";
import type { StaffRole } from "@light/shared-types";

export interface DashboardLayoutProps {
  staff: StaffIdentity;
  role: StaffRole;
  children: React.ReactNode;
}

export function DashboardLayout({ staff, role, children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const theme = ROLE_THEME[role];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop fixed sidebar */}
      <aside
        className={
          "hidden md:flex md:fixed md:inset-y-0 md:left-0 md:flex-col md:border-r md:border-slate-200 md:bg-white " +
          (collapsed ? "md:w-16" : "md:w-56")
        }
      >
        <Sidebar role={role} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen} side="left">
        <Sidebar role={role} onNavigate={() => setDrawerOpen(false)} />
      </Sheet>

      <div className={collapsed ? "md:pl-16" : "md:pl-56"}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
            <span className="font-semibold">{theme.label}</span>
            <Badge className={theme.badge}>{theme.label}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span data-testid="staff-name" className="text-sm font-medium text-slate-700">
              {staff.name}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
