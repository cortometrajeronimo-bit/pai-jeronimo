"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exportarGastosADrive } from "@/lib/drive-sync";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

export type ExpenseInput = {
  id?: string;
  project_id: string;
  concept: string;
  category: string;
  amount: number;
  date?: string | null;
  status?: string;
};

type Resp = { ok: true } | { ok: false; error: string };

function validar(data: ExpenseInput): string | null {
  if (!data.project_id) return "Falta el proyecto.";
  if (!data.concept?.trim()) return "El concepto es obligatorio.";
  if (!data.category) return "La categoría es obligatoria.";
  if (!Number.isFinite(data.amount) || data.amount <= 0)
    return "El monto debe ser mayor a 0.";
  if (data.date && !/^\d{4}-\d{2}-\d{2}$/.test(data.date))
    return "Fecha inválida (formato AAAA-MM-DD).";
  return null;
}

export async function guardarExpense(data: ExpenseInput): Promise<Resp> {
  const errMsg = validar(data);
  if (errMsg) return { ok: false, error: errMsg };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user)
    return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const { id, ...rest } = data;
  const payload = { ...rest, concept: rest.concept.trim() };

  if (id) {
    const { error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  } else {
    const { error } = await supabase.from("expenses").insert(payload);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  }

  revalidatePath("/presupuesto");
  revalidatePath("/proyecto");
  exportarGastosADrive(data.project_id).catch(console.warn);
  return { ok: true };
}

export async function eliminarExpense(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { data: exp } = await supabase
    .from("expenses")
    .select("project_id")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/presupuesto");
  revalidatePath("/proyecto");
  if (exp?.project_id) exportarGastosADrive(exp.project_id).catch(console.warn);
  return { ok: true };
}
