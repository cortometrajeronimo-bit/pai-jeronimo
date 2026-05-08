"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CallSheetInput = {
  id?: string;
  project_id: string;
  date: string;
  location?: string | null;
  call_time?: string | null;
  crew_ids: string[];
  safety_notes?: string | null;
  weather_plan_b?: string | null;
  notes?: string | null;
  status?: string;
};

export async function guardarCallSheet(data: CallSheetInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("call_sheets").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("call_sheets").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/call-sheets");
  return { ok: true };
}

export async function eliminarCallSheet(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("call_sheets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/call-sheets");
  return { ok: true };
}
