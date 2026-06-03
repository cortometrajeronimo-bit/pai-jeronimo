"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

export type Categoria =
  | "guion"
  | "guion_tecnico"
  | "cronograma"
  | "plan_rodaje"
  | "propuesta_direccion"
  | "propuesta_foto"
  | "propuesta_arte"
  | "propuesta_sonido"
  | "propuesta_montaje"
  | "otro";

type Resp = { ok: true } | { ok: false; error: string };

export async function anclarDocumento(input: {
  project_id: string;
  drive_file_id: string;
  category: Categoria;
  title: string;
}): Promise<Resp> {
  if (!input.project_id || !input.drive_file_id || !input.title?.trim())
    return { ok: false, error: "Faltan datos para anclar el documento." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_documents").insert({
    project_id: input.project_id,
    drive_file_id: input.drive_file_id,
    category: input.category,
    title: input.title.trim(),
    pinned_in_proyecto: true,
  });
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };

  revalidatePath("/proyecto");
  return { ok: true };
}

export async function desanclarDocumento(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/proyecto");
  return { ok: true };
}

export async function crearCalendarioProyecto(projectId: string): Promise<Resp> {
  if (!projectId) return { ok: false, error: "ID de proyecto inválido." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const { data: project, error: fetchErr } = await supabase
    .from("projects")
    .select("name, google_calendar_id")
    .eq("id", projectId)
    .maybeSingle();

  if (fetchErr || !project) {
    return { ok: false, error: "No se encontró el proyecto." };
  }

  if (project.google_calendar_id) {
    return { ok: false, error: "El proyecto ya tiene un calendario de Google asociado." };
  }

  try {
    const { crearCalendarioCompartido, sincronizarCallSheetACalendar, sincronizarTransporteACalendar } = await import("@/lib/google-calendar");
    const { calendarId, shareLink } = await crearCalendarioCompartido(project.name);

    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        google_calendar_id: calendarId,
        google_calendar_link: shareLink
      })
      .eq("id", projectId);

    if (updateErr) {
      return { ok: false, error: `Error al guardar calendario en DB: ${updateErr.message}` };
    }

    // Sincronizar retroactivamente llamados y transportes existentes
    const [{ data: callSheets }, { data: transports }] = await Promise.all([
      supabase.from("call_sheets").select("*").eq("project_id", projectId),
      supabase.from("transport").select("*").eq("project_id", projectId),
    ]);

    if (callSheets && callSheets.length > 0) {
      for (const cs of callSheets) {
        await sincronizarCallSheetACalendar(projectId, cs).catch(console.error);
      }
    }

    if (transports && transports.length > 0) {
      for (const t of transports) {
        await sincronizarTransporteACalendar(projectId, t).catch(console.error);
      }
    }

    revalidatePath("/proyecto");
    revalidatePath("/transport");
    revalidatePath("/call-sheets");

    return { ok: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error desconocido";
    return { ok: false, error: `Error al crear el calendario en Google: ${errorMsg}` };
  }
}
