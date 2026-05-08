import { createClient } from "@/lib/supabase/server";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";

export default async function PresupuestoPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Presupuesto</h1>
          <p className="text-textoSec mt-1">JERÓNIMO · 4 categorías · COP</p>
        </div>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <PresupuestoClient expenses={expenses ?? []} projectId={projectId} />
      )}
    </div>
  );
}
