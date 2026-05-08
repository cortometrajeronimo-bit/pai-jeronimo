import { createClient } from "@/lib/supabase/server";
import { IncidentsClient } from "@/components/incidents/IncidentsClient";

export default async function IncidentsPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: incidents } = await supabase
    .from("incidents")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incidentes & Botiquín</h1>
        <p className="text-textoSec mt-1">Reporte de seguridad y eventos del rodaje</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <IncidentsClient incidents={incidents ?? []} projectId={projectId} />
      )}
    </div>
  );
}
