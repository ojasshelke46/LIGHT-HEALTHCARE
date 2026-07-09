"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  children: React.ReactNode;
}

/**
 * Hand-rolled, a11y-conscious sheet/drawer (no radix — D-01).
 * Controlled component: closes on overlay click and Escape.
 */
export function Sheet({ open, onOpenChange, side = "left", children }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 z-50 w-72 bg-white shadow-xl",
          side === "left" ? "left-0" : "right-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
