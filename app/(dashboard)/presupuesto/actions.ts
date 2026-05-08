"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  return { ok: true };
}

export async function eliminarExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/presupuesto");
  return { ok: true };
}
