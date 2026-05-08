import { createClient } from "@/lib/supabase/server";
import { DailyReportsClient } from "@/components/daily-reports/DailyReportsClient";

export default async function DailyReportsPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, location")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";

  const [{ data: reports }, { data: crew }, { data: cashflow }] = await Promise.all([
    supabase.from("daily_reports").select("*").order("date", { ascending: false }),
    supabase.from("crew_members").select("id, name, role").order("name"),
    supabase.from("cash_flow").select("date, amount, type").eq("is_projected", false),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Daily Reports</h1>
        <p className="text-textoSec mt-1">Reporte diario de jornada · JERÓNIMO</p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <DailyReportsClient
          reports={reports ?? []}
          crew={crew ?? []}
          cashflow={cashflow ?? []}
          projectId={projectId}
          projectName={project?.name ?? "JERÓNIMO"}
          projectLocation={project?.location ?? "Tuluá, Valle del Cauca"}
        />
      )}
    </div>
  );
}
