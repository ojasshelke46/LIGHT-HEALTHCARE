"use client";

import { Button } from "@/components/ui/button";

/**
 * Client error boundary UI for server-rendered portal routes (D-12).
 * Never renders raw error internals (message/stack/digest) -- generic copy
 * only, per T-01-13. Retry is user-initiated only (no auto-retry loop).
 */
export function PortalError({
  reset,
  message,
}: {
  reset: () => void;
  message?: string;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm">
        {message ?? "We couldn't load this page."}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={reset}
      >
        Try again
      </Button>
    </div>
  );
}
