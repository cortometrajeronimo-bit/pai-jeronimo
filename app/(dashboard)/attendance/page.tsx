import { createClient } from "@/lib/supabase/server";
import { AttendanceClient } from "@/components/attendance/AttendanceClient";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";
  const fecha = searchParams.date ?? new Date().toISOString().slice(0, 10);

  const [{ data: crew }, { data: attendance }] = await Promise.all([
    supabase.from("crew_members").select("id, name, role").order("name"),
    supabase.from("attendance").select("*").eq("date", fecha),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asistencia</h1>
        <p className="text-textoSec mt-1">Check-in del día · {fecha}</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <AttendanceClient
          crew={crew ?? []}
          attendance={attendance ?? []}
          projectId={projectId}
          fecha={fecha}
        />
      )}
    </div>
  );
}
