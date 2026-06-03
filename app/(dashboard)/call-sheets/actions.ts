"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CallSheet } from "@/lib/types";

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
  
  let resultCallSheet: CallSheet | null = null;

  if (id) {
    const { data: updated, error } = await supabase
      .from("call_sheets")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    resultCallSheet = updated;
  } else {
    const { data: inserted, error } = await supabase
      .from("call_sheets")
      .insert(rest)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    resultCallSheet = inserted;
  }

  // Sincronizar con Google Calendar
  if (resultCallSheet) {
    try {
      const { sincronizarCallSheetACalendar } = await import("@/lib/google-calendar");
      await sincronizarCallSheetACalendar(data.project_id, resultCallSheet);
    } catch (err) {
      console.error("Google Calendar Sync error:", err);
    }
  }

  revalidatePath("/call-sheets");
  return { ok: true };
}

export async function eliminarCallSheet(id: string) {
  const supabase = await createClient();

  // Obtener los datos antes de borrar para saber el project_id
  const { data: existing } = await supabase
    .from("call_sheets")
    .select("project_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("call_sheets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Eliminar el evento en Google Calendar
  if (existing?.project_id) {
    try {
      const { eliminarEventoCalendar } = await import("@/lib/google-calendar");
      await eliminarEventoCalendar(existing.project_id, id);
    } catch (err) {
      console.error("Google Calendar Sync error:", err);
    }
  }

  revalidatePath("/call-sheets");
  return { ok: true };
}
