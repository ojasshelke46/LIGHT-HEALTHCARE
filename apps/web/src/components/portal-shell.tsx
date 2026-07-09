import { SignOutButton } from "./sign-out-button";

/** Shared chrome for every role portal. Real nav/layout lands per-phase. */
export function PortalShell({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Light Healthcare</span>
          <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-teal-700">
            {role}
          </span>
        </div>
        <SignOutButton />
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
