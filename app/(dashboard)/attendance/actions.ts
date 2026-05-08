"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Attendance } from "@/lib/types";

// Marca llegada (check_in_time = now). Si ya hay registro del día, actualiza.
export async function marcarLlegada(projectId: string, crewId: string) {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("attendance").upsert(
    {
      project_id: projectId,
      crew_member_id: crewId,
      date: hoy,
      check_in_time: new Date().toISOString(),
      status: "presente",
    },
    { onConflict: "project_id,crew_member_id,date" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attendance");
  return { ok: true };
}

export async function marcarSalida(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance")
    .update({ check_out_time: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attendance");
  return { ok: true };
}

export async function actualizarEstado(
  id: string,
  status: Attendance["status"],
  notes?: string
) {
  const supabase = await createClient();
  const update: Partial<Attendance> = { status };
  if (notes !== undefined) update.notes = notes;
  const { error } = await supabase.from("attendance").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attendance");
  return { ok: true };
}

export async function eliminarAsistencia(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("attendance").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/attendance");
  return { ok: true };
}
