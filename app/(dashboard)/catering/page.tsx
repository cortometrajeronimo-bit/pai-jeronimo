import { createClient } from "@/lib/supabase/server";
import { CateringView } from "@/components/catering/CateringView";

export default async function CateringPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";
  const [{ data: meals }, { data: crew }] = await Promise.all([
    supabase.from("catering").select("*").order("date", { ascending: false }),
    // Solo necesitamos quienes tienen restricciones para alertas
    supabase
      .from("crew_members")
      .select("id, name, dietary_restrictions")
      .not("dietary_restrictions", "is", null),
  ]);

  // Filtrar a los que realmente tienen restricciones no vacías
  const conRestriccion = (crew ?? []).filter(
    (c) => c.dietary_restrictions && c.dietary_restrictions.trim().length > 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catering</h1>
        <p className="text-textoSec mt-1">Comidas del rodaje · alimentación crew</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <CateringView
          meals={meals ?? []}
          conRestriccion={conRestriccion}
          projectId={projectId}
        />
      )}
    </div>
  );
}
