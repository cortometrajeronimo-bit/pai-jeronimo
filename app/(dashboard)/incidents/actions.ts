"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Incident } from "@/lib/types";

export type IncidentInput = {
  id?: string;
  project_id: string;
  date: string;
  type: Incident["type"];
  description: string;
  affected_person?: string | null;
  action_taken?: string | null;
  reporter?: string | null;
};

export async function guardarIncidente(data: IncidentInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("incidents").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("incidents").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/incidents");
  return { ok: true };
}

export async function eliminarIncidente(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/incidents");
  return { ok: true };
}
