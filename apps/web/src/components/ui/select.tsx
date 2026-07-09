import * as React from "react";
import { cn } from "@/lib/utils";

// Native-backed for v1; swap to a composable popover Select later — API-compatible
// props kept minimal.

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

// Convenience re-export so callers can write <SelectItem value="x">Label</SelectItem>
// instead of a raw <option>.
export const SelectItem = "option" as const;
