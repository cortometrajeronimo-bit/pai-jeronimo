"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProducerLog } from "@/lib/types";

export type ProducerLogInput = {
  id?: string;
  project_id: string;
  date: string;
  category: ProducerLog["category"];
  content: string;
};

export async function guardarLog(data: ProducerLogInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("producer_logs").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("producer_logs").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/logbook");
  return { ok: true };
}

export async function eliminarLog(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("producer_logs").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/logbook");
  return { ok: true };
}

// --- Hilo de actualizaciones --------------------------------------------------

export async function agregarActualizacion(logId: string, note: string) {
  const texto = note.trim();
  if (!texto) return { ok: false, error: "La nota está vacía" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("producer_log_updates")
    .insert({ log_id: logId, note: texto });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/logbook");
  return { ok: true };
}

export async function eliminarActualizacion(updateId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("producer_log_updates")
    .delete()
    .eq("id", updateId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/logbook");
  return { ok: true };
}

export async function marcarCompletada(logId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("producer_logs")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", logId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/logbook");
  return { ok: true };
}

export async function reabrir(logId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("producer_logs")
    .update({ completed_at: null })
    .eq("id", logId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/logbook");
  return { ok: true };
}
