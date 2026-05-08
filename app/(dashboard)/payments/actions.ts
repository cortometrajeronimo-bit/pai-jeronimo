"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CrewPayment } from "@/lib/types";

export type PaymentInput = {
  id?: string;
  project_id: string;
  crew_member_id: string;
  amount: number;
  agreed_date?: string | null;
  paid_date?: string | null;
  status: CrewPayment["status"];
  method?: string | null;
  notes?: string | null;
};

export async function guardarPago(data: PaymentInput) {
  const supabase = await createClient();
  const { id, ...rest } = data;
  if (id) {
    const { error } = await supabase.from("crew_payments").update(rest).eq("id", id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("crew_payments").insert(rest);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/payments");
  return { ok: true };
}

export async function eliminarPago(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("crew_payments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/payments");
  return { ok: true };
}

export async function marcarPagado(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crew_payments")
    .update({ status: "pagado", paid_date: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/payments");
  return { ok: true };
}
