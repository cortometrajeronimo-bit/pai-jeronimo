"use server";

// Server Actions para CRUD de contactos
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ContactInput = {
  id?: string;
  project_id: string;
  name: string;
  type?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  tags?: string[];
  is_favorite?: boolean;
};

export async function guardarContacto(data: ContactInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("contacts").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("contacts").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/contactos");
  return { ok: true };
}

export async function eliminarContacto(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contactos");
  return { ok: true };
}

export async function alternarFavorito(id: string, valor: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ is_favorite: valor })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contactos");
  return { ok: true };
}
