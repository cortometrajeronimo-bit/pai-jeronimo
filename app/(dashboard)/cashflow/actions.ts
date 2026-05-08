"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exportarCashFlowADrive } from "@/lib/drive-sync";

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

export async function guardarCashFlow(data: CashFlowInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("cash_flow").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("cash_flow").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/cashflow");
  revalidatePath("/dashboard");
  exportarCashFlowADrive(data.project_id).catch(console.warn);
  return { ok: true };
}

export async function eliminarCashFlow(id: string) {
  const supabase = await createClient();
  const { data: cf } = await supabase.from("cash_flow").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("cash_flow").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cashflow");
  if (cf?.project_id) exportarCashFlowADrive(cf.project_id).catch(console.warn);
  return { ok: true };
}

// Materializar una proyección: marcarla como real (is_projected = false)
export async function materializarProyeccion(id: string) {
  const supabase = await createClient();
  const { data: cf } = await supabase.from("cash_flow").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("cash_flow").update({ is_projected: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/cashflow");
  if (cf?.project_id) exportarCashFlowADrive(cf.project_id).catch(console.warn);
  return { ok: true };
}
