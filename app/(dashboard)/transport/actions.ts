"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TransportInput = {
  id?: string;
  project_id: string;
  vehicle_name: string;
  driver?: string | null;
  capacity?: number | null;
  departure_time?: string | null;
  route?: string | null;
  crew_assigned: string[];
  notes?: string | null;
};

export async function guardarTransporte(data: TransportInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("transport").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("transport").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/transport");
  return { ok: true };
}

export async function eliminarTransporte(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transport").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/transport");
  return { ok: true };
}
