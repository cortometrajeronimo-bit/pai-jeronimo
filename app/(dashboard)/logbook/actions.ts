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
