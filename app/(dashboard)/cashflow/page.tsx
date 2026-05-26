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

  const [{ data: movimientos }, { data: expenses }] = await Promise.all([
    supabase
      .from("cash_flow")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: true }),
    supabase
      .from("expenses")
      .select("amount, status")
      .eq("project_id", projectId),
  ]);

  // Presupuesto disponible combinado: ambas fuentes se reflejan aquí.
  // - expenses ejecutado/comprometido: lo planificado y pagado en el presupuesto
  // - cash_flow egresos reales: pagos registrados directamente en caja
  // Nota: si el mismo gasto existe en ambas tablas se contará dos veces.
  const ejecutadoExpenses = (expenses ?? [])
    .filter((e) => e.status === "ejecutado" || e.status === "comprometido")
    .reduce((a, e) => a + Number(e.amount), 0);
  const egresosCaja = (movimientos ?? [])
    .filter((m) => m.type === "expense" && !m.is_projected)
    .reduce((a, m) => a + Number(m.amount), 0);
  const presupuestoDisponible = presupuesto - ejecutadoExpenses - egresosCaja;

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
          presupuestoDisponible={presupuestoDisponible}
        />
      )}
    </div>
  );
}
