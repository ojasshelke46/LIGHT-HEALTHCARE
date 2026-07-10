"use client";

/**
 * View-result control (D-35). Resolves a stored `result_url` (Storage path
 * or legacy http(s) URL) into an openable URL on click via getResultUrl —
 * never precomputed — and opens it in a new tab. Renders nothing when there
 * is no result yet.
 */

import { useState } from "react";
import { toast } from "sonner";
import { getResultUrl } from "@/lib/results";

export function ResultLink({ pathOrUrl }: { pathOrUrl: string | null }) {
  const [loading, setLoading] = useState(false);

  if (!pathOrUrl) return null;

  async function handleClick() {
    setLoading(true);
    const url = await getResultUrl(pathOrUrl);
    setLoading(false);

    if (!url) {
      toast.error("Could not open result");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      data-testid="view-result"
      className="text-blue-600 hover:underline"
    >
      {loading ? "Opening…" : "View result"}
    </button>
  );
}
