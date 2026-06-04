import { createClient } from "@/lib/supabase/server";
import { PresupuestoClient } from "@/components/presupuesto/PresupuestoClient";

export const dynamic = "force-dynamic";

export default async function PresupuestoPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, budget_total")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";

  // Cargamos TODO el cash_flow del proyecto (incluye proyecciones) para que
  // PresupuestoClient pueda sumar `ejecutado` (is_projected=false) y
  // `comprometido` (is_projected=true) por categoría. La lista visible
  // de "Movimientos de caja reales" se filtra en cliente.
  const [{ data: expenses }, { data: cashFlow }] = await Promise.all([
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    projectId
      ? supabase
          .from("cash_flow")
          .select("*")
          .eq("project_id", projectId)
          .order("date", { ascending: false })
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
          cashFlow={cashFlow ?? []}
          projectId={projectId}
        />
      )}
    </div>
  );
}
