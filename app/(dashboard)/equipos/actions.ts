"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { exportarEquiposADrive } from "@/lib/drive-sync";

export type EquipmentInput = {
  id?: string;
  project_id: string;
  name: string;
  category: string;
  units?: number;
  brand?: string | null;
  model?: string | null;
  provider?: string | null;
  status?: string;
  notes?: string | null;
};

export async function guardarEquipo(data: EquipmentInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("equipment").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("equipment").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/equipos");
  exportarEquiposADrive(data.project_id).catch(console.warn);
  return { ok: true };
}

export async function eliminarEquipo(id: string) {
  const supabase = await createClient();
  const { data: eq } = await supabase.from("equipment").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("equipment").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/equipos");
  if (eq?.project_id) exportarEquiposADrive(eq.project_id).catch(console.warn);
  return { ok: true };
}

export async function actualizarEstadoEquipo(id: string, status: string) {
  const supabase = await createClient();
  const { data: eq } = await supabase.from("equipment").select("project_id").eq("id", id).single();
  const { error } = await supabase.from("equipment").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/equipos");
  if (eq?.project_id) exportarEquiposADrive(eq.project_id).catch(console.warn);
  return { ok: true };
}
