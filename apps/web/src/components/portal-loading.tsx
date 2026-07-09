import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic page-shaped skeleton for server-rendered portal routes (D-12).
 * Rendered by each role segment's loading.tsx. This is the Phase-1 shape;
 * Phase 2+ pages may specialize their own skeleton composition per view.
 */
export function PortalLoading() {
  return (
    <div className="space-y-3 p-4 md:p-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
