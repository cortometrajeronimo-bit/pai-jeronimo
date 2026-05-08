"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exportarGastosADrive } from "@/lib/drive-sync";

export type ExpenseInput = {
  id?: string;
  project_id: string;
  concept: string;
  category: string;
  amount: number;
  date?: string | null;
  status?: string;
};

export async function guardarExpense(data: ExpenseInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("expenses").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("expenses").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/presupuesto");
  exportarGastosADrive(data.project_id).catch(console.warn);
  return { ok: true };
}

export async function eliminarExpense(id: string) {
  const supabase = await createClient();
  const { data: exp } = await supabase.from("expenses").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/presupuesto");
  if (exp?.project_id) exportarGastosADrive(exp.project_id).catch(console.warn);
  return { ok: true };
}
