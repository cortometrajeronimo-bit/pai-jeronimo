import { createClient } from "@/lib/supabase/server";
import { CrewClient } from "@/components/crew/CrewClient";

export default async function CrewPage() {
  const supabase = await createClient();

  // Obtenemos el proyecto JERÓNIMO (1 solo en MVP) para vincular nuevos miembros
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: crew } = await supabase
    .from("crew_members")
    .select("*")
    .order("role");

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Crew</h1>
        <p className="text-textoSec mt-1">
          {crew?.length ?? 0} {crew?.length === 1 ? "persona" : "personas"} · JERÓNIMO
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <CrewClient crew={crew ?? []} projectId={projectId} />
      )}
    </div>
  );
}
