import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

/** Starter shared button. Real design system lands with the UI phase. */
export function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-teal-600 text-white hover:bg-teal-700"
      : "bg-transparent text-slate-700 hover:bg-slate-100";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
