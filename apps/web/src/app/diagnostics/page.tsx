import { PortalShell } from "@/components/portal-shell";

export default function DiagnosticsPage() {
  return (
    <PortalShell role="lab_tech">
      <h1 className="text-xl font-semibold">Diagnostics</h1>
      <p className="mt-2 text-slate-600">
        Placeholder. Phase 6: order queue (Realtime), result upload to
        Cloudflare R2, mark completed.
      </p>
    </PortalShell>
  );
}
