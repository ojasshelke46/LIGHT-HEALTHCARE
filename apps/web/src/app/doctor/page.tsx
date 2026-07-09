import { PortalShell } from "@/components/portal-shell";

export default function DoctorPage() {
  return (
    <PortalShell role="doctor">
      <h1 className="text-xl font-semibold">Doctor</h1>
      <p className="mt-2 text-slate-600">
        Placeholder. Phase 5: today&apos;s checked-in patients (Realtime),
        history, consultation notes → visits, orders, prescriptions.
      </p>
    </PortalShell>
  );
}
