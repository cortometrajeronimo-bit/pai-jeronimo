"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CrewPayment } from "@/lib/types";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

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

type Resp = { ok: true } | { ok: false; error: string };

function validar(data: PaymentInput): string | null {
  if (!data.project_id) return "Falta el proyecto.";
  if (!data.crew_member_id) return "Selecciona un miembro del crew.";
  if (!Number.isFinite(data.amount) || data.amount <= 0)
    return "El monto debe ser mayor a 0.";
  if (data.agreed_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.agreed_date))
    return "Fecha acordada inválida.";
  if (data.paid_date && !/^\d{4}-\d{2}-\d{2}$/.test(data.paid_date))
    return "Fecha pagada inválida.";
  return null;
}

export async function guardarPago(data: PaymentInput): Promise<Resp> {
  const errMsg = validar(data);
  if (errMsg) return { ok: false, error: errMsg };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user)
    return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const { id, ...rest } = data;

  if (id) {
    const { error } = await supabase
      .from("crew_payments")
      .update(rest)
      .eq("id", id);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  } else {
    const { error } = await supabase.from("crew_payments").insert(rest);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  }

  revalidatePath("/payments");
  revalidatePath("/equipo");
  return { ok: true };
}

export async function eliminarPago(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase.from("crew_payments").delete().eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/payments");
  revalidatePath("/equipo");
  return { ok: true };
}

export async function marcarPagado(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("crew_payments")
    .update({
      status: "pagado",
      paid_date: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/payments");
  revalidatePath("/equipo");
  return { ok: true };
}
