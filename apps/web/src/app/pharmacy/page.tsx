import { PortalShell } from "@/components/portal-shell";

export default function PharmacyPage() {
  return (
    <PortalShell role="pharmacist">
      <h1 className="text-xl font-semibold">Pharmacy</h1>
      <p className="mt-2 text-slate-600">
        Placeholder. Phase 7: prescription queue (Realtime), stock
        check/decrement, dispense action.
      </p>
    </PortalShell>
  );
}
