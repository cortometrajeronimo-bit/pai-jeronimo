import { createClient } from "@/lib/supabase/server";
import { EquiposClient } from "@/components/equipos/EquiposClient";

export default async function EquiposPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: equipos } = await supabase
    .from("equipment")
    .select("*")
    .order("category")
    .order("name");

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Equipos</h1>
        <p className="text-textoSec mt-1">
          Inventario · {equipos?.length ?? 0} items
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <EquiposClient equipos={equipos ?? []} projectId={projectId} />
      )}
    </div>
  );
}
