import { PortalShell } from "@/components/portal-shell";

export default function AdminPage() {
  return (
    <PortalShell role="admin">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-2 text-slate-600">
        Placeholder. Staff management, audit log, org config.
      </p>
    </PortalShell>
  );
}
