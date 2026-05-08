"use server";

// Server Actions para CRUD de crew_members
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CrewInput = {
  id?: string;
  project_id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  id_number?: string | null;
  blood_type?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  eps?: string | null;
  dietary_restrictions?: string | null;
  notes?: string | null;
  daily_rate?: number | null;
  is_active?: boolean;
  is_confirmed?: boolean;
};

export async function guardarCrew(data: CrewInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;

  if (id) {
    const { error } = await supabase.from("crew_members").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("crew_members").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/crew");
  return { ok: true };
}

export async function eliminarCrew(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("crew_members").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/crew");
  return { ok: true };
}

export async function alternarConfirmado(id: string, valor: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crew_members")
    .update({ is_confirmed: valor })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/crew");
  return { ok: true };
}
