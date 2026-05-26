import { createClient } from "@/lib/supabase/server";
import { CashFlowClient } from "@/components/cashflow/CashFlowClient";

export default async function CashFlowPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, budget_total")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";
  const presupuesto = Number(project?.budget_total ?? 10_300_500);

  const { data: movimientos } = await supabase
    .from("cash_flow")
    .select("*")
    .eq("project_id", projectId)
    .order("date", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flujo de Caja</h1>
          <p className="text-textoSec mt-1">
            JERÓNIMO · Diaria · Semanal · Mensual · Proyecciones
          </p>
        </div>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <CashFlowClient
          movimientos={movimientos ?? []}
          projectId={projectId}
          presupuesto={presupuesto}
        />
      )}
    </div>
  );
}
