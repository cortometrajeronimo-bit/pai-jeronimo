"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type DailyReportInput = {
  id?: string;
  project_id: string;
  date: string;
  crew_present: string[];
  scenes_completed?: string | null;
  incidents?: string | null;
  expenses_total?: number;
  notes?: string | null;
};

export async function guardarDailyReport(data: DailyReportInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("daily_reports").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    // Upsert por (project_id, date) para evitar duplicados accidentales
    const { error } = await supabase
      .from("daily_reports")
      .upsert(rest, { onConflict: "project_id,date" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/daily-reports");
  return { ok: true };
}

export async function eliminarDailyReport(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("daily_reports").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/daily-reports");
  return { ok: true };
}
