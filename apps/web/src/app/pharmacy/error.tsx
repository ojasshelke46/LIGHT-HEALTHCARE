"use client";

import { PortalError } from "@/components/portal-error";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PortalError reset={reset} />;
}
