"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exportarCashFlowADrive } from "@/lib/drive-sync";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

export type CashFlowInput = {
  id?: string;
  project_id: string;
  date: string;
  concept: string;
  type: "income" | "expense";
  amount: number;
  category?: string | null;
  is_projected?: boolean;
  notes?: string | null;
};

type Resp = { ok: true } | { ok: false; error: string };

function validar(data: CashFlowInput): string | null {
  if (!data.project_id) return "Falta el proyecto.";
  if (!data.concept?.trim()) return "El concepto es obligatorio.";
  if (!Number.isFinite(data.amount) || data.amount <= 0)
    return "El monto debe ser mayor a 0.";
  if (data.type !== "income" && data.type !== "expense")
    return "Tipo inválido (ingreso/egreso).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    return "Fecha inválida (formato AAAA-MM-DD).";
  return null;
}

export async function guardarCashFlow(data: CashFlowInput): Promise<Resp> {
  const errMsg = validar(data);
  if (errMsg) return { ok: false, error: errMsg };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user)
    return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const { id, ...rest } = data;
  const concept = rest.concept.trim();
  const payload = { ...rest, concept };

  if (id) {
    const { error } = await supabase
      .from("cash_flow")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  } else {
    const { error } = await supabase.from("cash_flow").insert(payload);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  }

  revalidatePath("/cashflow");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  revalidatePath("/proyecto");
  exportarCashFlowADrive(data.project_id).catch(console.warn);
  return { ok: true };
}

export async function eliminarCashFlow(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { data: cf } = await supabase
    .from("cash_flow")
    .select("project_id")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("cash_flow").delete().eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/cashflow");
  revalidatePath("/proyecto");
  if (cf?.project_id) exportarCashFlowADrive(cf.project_id).catch(console.warn);
  return { ok: true };
}

// Materializar una proyección: marcarla como real (is_projected = false)
export async function materializarProyeccion(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { data: cf } = await supabase
    .from("cash_flow")
    .select("project_id")
    .eq("id", id)
    .single();
  const { error } = await supabase
    .from("cash_flow")
    .update({ is_projected: false })
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/cashflow");
  if (cf?.project_id) exportarCashFlowADrive(cf.project_id).catch(console.warn);
  return { ok: true };
}
