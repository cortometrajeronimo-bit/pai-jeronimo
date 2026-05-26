import { createClient } from "@/lib/supabase/server";
import { LogbookClient } from "@/components/logbook/LogbookClient";

export default async function LogbookPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  // Trae cada bitácora con sus updates anidadas (single round-trip, evita N+1)
  const { data: logs } = await supabase
    .from("producer_logs")
    .select(
      "*, producer_log_updates(id, log_id, note, created_at)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bitácora del Productor</h1>
        <p className="text-textoSec mt-1">Notas, urgencias y seguimiento diario</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <LogbookClient logs={logs ?? []} projectId={projectId} />
      )}
    </div>
  );
}
