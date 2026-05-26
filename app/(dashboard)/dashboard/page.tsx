import { redirect } from "next/navigation";

// /dashboard fue absorbido por /proyecto en la nueva navegación.
export default function DashboardPage() {
  redirect("/proyecto");
}
