import { createClient } from "@/lib/supabase/server";
import { CallSheetGenerador } from "@/components/call-sheets/CallSheetGenerador";

export default async function CallSheetsPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id,name")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: sheets } = await supabase
    .from("call_sheets")
    .select("*")
    .order("date", { ascending: true });

  const { data: crew } = await supabase
    .from("crew_members")
    .select("*")
    .order("name");

  const projectId = project?.id ?? "";
  const proyectoNombre = project?.name ?? "JERÓNIMO";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Call Sheets</h1>
        <p className="text-textoSec mt-1">
          Hojas de llamado por día de rodaje · 4-10 jun 2026
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <CallSheetGenerador
          callSheets={sheets ?? []}
          crew={crew ?? []}
          projectId={projectId}
          proyectoNombre={proyectoNombre}
        />
      )}
    </div>
  );
}
