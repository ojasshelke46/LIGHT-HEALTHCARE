import type { LucideIcon } from "lucide-react";

/**
 * Reusable "no rows" empty state (icon + title + description). Used by
 * client realtime views per the D-13 convention documented in
 * dashboard-layout.tsx, and by any server-rendered view with zero rows.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Icon className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? (
        <p className="text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
