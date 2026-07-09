import { PortalShell } from "@/components/portal-shell";

export default function ReceptionPage() {
  return (
    <PortalShell role="reception">
      <h1 className="text-xl font-semibold">Reception</h1>
      <p className="mt-2 text-slate-600">
        Placeholder. Phase 4: live queue (Realtime on appointments), QR/manual
        check-in, billing entry.
      </p>
    </PortalShell>
  );
}
