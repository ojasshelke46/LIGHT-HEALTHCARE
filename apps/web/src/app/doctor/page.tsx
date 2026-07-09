import { getStaff } from "@/lib/staff";
import { DoctorToday } from "./doctor-today";

/**
 * Doctor "today" landing (DOC-01). Server component — reads the signed-in
 * doctor's own staff id via getStaff() (server-verified, never client
 * input) and hands it to the live client list. doctors.id === staff.id.
 */
export default async function DoctorPage() {
  const staff = await getStaff();
  return <DoctorToday staffId={staff.id} />;
}
