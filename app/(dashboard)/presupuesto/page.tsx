import { createClient } from "@/lib/supabase/server";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";

export default async function PresupuestoPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, budget_total")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";

  const [{ data: expenses }, { data: movimientosCaja }] = await Promise.all([
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    projectId
      ? supabase
          .from("cash_flow")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_projected", false)
          .order("date", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

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
        <PresupuestoClient
          expenses={expenses ?? []}
          movimientosCaja={movimientosCaja ?? []}
          projectId={projectId}
        />
      )}
    </div>
  );
}
