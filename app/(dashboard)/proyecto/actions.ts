"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

export type Categoria =
  | "guion"
  | "guion_tecnico"
  | "cronograma"
  | "plan_rodaje"
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
