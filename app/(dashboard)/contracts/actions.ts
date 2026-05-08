"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Contract } from "@/lib/types";

export type ContractInput = {
  id?: string;
  project_id: string;
  name: string;
  type: Contract["type"];
  sign_date?: string | null;
  expiry_date?: string | null;
  status: Contract["status"];
  file_url?: string | null;
  notes?: string | null;
};

export async function guardarContrato(data: ContractInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("contracts").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("contracts").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/contracts");
  return { ok: true };
}

export async function eliminarContrato(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/contracts");
  return { ok: true };
}
