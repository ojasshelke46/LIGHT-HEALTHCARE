"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  /** Accessible name for the dialog. */
  label?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hand-rolled, a11y-conscious sheet/drawer (no radix — D-01).
 * Controlled component: closes on overlay click and Escape.
 * Focus management: moves focus into the panel on open, traps Tab within it,
 * and restores focus to the previously focused element on close.
 */
export function Sheet({
  open,
  onOpenChange,
  side = "left",
  label = "Navigation",
  children,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (!firstEl || !lastEl) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (event.shiftKey && (active === firstEl || active === panel)) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreRef.current?.focus();
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 z-50 w-72 bg-white shadow-xl focus:outline-none",
          side === "left" ? "left-0" : "right-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
