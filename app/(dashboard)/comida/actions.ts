"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Catering } from "@/lib/types";

export type CateringInput = {
  id?: string;
  project_id: string;
  date: string;
  meal_type: Catering["meal_type"];
  menu?: string | null;
  provider?: string | null;
  portions_count?: number | null;
  notes?: string | null;
};

export async function guardarCatering(data: CateringInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("catering").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("catering").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/comida");
  return { ok: true };
}

export async function eliminarCatering(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  const { error } = await supabase.from("catering").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/comida");
  return { ok: true };
}
