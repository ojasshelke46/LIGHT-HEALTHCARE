import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

const baseClasses =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-800",
  secondary: "bg-slate-200 text-slate-700",
  outline: "border border-slate-300 text-slate-700",
  destructive: "bg-red-100 text-red-800",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span className={cn(baseClasses, variants[variant], className)} {...props} />
  );
}
