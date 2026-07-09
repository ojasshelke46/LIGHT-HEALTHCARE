import { getStaff } from "@/lib/staff";
import { DashboardLayout } from "@/components/dashboard-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  return (
    <DashboardLayout staff={staff} role="reception">
      {children}
    </DashboardLayout>
  );
}
