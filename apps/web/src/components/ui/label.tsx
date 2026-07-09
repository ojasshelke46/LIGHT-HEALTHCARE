import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, htmlFor, children, ...props }, ref) => {
  return (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className={cn("text-sm font-medium text-slate-700", className)}
      {...props}
    >
      {children}
    </label>
  );
});
Label.displayName = "Label";
