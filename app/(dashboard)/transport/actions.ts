"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Transport } from "@/lib/types";

export type TransportInput = {
  id?: string;
  project_id: string;
  vehicle_name: string;
  driver?: string | null;
  capacity?: number | null;
  date?: string | null;
  departure_time?: string | null;
  arrival_time?: string | null;
  route?: string | null;
  crew_assigned: string[];
  notes?: string | null;
  allocated_money?: number | null;
  cash_flow_id?: string | null;
};

export async function guardarTransporte(data: TransportInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const { id, ...rest } = data;

  // Si se está editando, buscar el cash_flow_id existente
  let existingCashFlowId: string | null = null;
  if (id) {
    const { data: existing } = await supabase
      .from("transport")
      .select("cash_flow_id")
      .eq("id", id)
      .maybeSingle();
    if (existing) {
      existingCashFlowId = existing.cash_flow_id;
    }
  }

  const money = Number(rest.allocated_money) || 0;
  let finalCashFlowId: string | null = existingCashFlowId;

  // Sincronización con Flujo de Caja
  if (money > 0) {
    const cashFlowPayload = {
      project_id: rest.project_id,
      date: rest.date || new Date().toISOString().slice(0, 10),
      concept: `Transporte: ${rest.vehicle_name}`,
      type: "expense" as const,
      amount: money,
      category: "produccion", // Todos los transportes van a producción
      is_projected: true,
      notes: `Presupuesto asignado al vehículo: ${rest.vehicle_name}. Sincronizado automáticamente.`
    };

    if (finalCashFlowId) {
      const { error: cfError } = await supabase
        .from("cash_flow")
        .update(cashFlowPayload)
        .eq("id", finalCashFlowId);
      if (cfError) return { ok: false, error: `Error al actualizar flujo de caja: ${cfError.message}` };
    } else {
      const { data: newCf, error: cfError } = await supabase
        .from("cash_flow")
        .insert(cashFlowPayload)
        .select("id")
        .single();
      if (cfError) return { ok: false, error: `Error al crear flujo de caja: ${cfError.message}` };
      finalCashFlowId = newCf.id;
    }
  } else {
    // Si el presupuesto es 0 y existía un registro en cash_flow, lo borramos
    if (finalCashFlowId) {
      await supabase.from("cash_flow").delete().eq("id", finalCashFlowId);
      finalCashFlowId = null;
    }
  }

  // Guardar en la tabla transport
  const transportPayload = {
    ...rest,
    allocated_money: money,
    cash_flow_id: finalCashFlowId
  };

  let resultTransport: Transport | null = null;

  if (id) {
    const { data: updated, error } = await supabase
      .from("transport")
      .update(transportPayload)
      .eq("id", id)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    resultTransport = updated;
  } else {
    const { data: inserted, error } = await supabase
      .from("transport")
      .insert(transportPayload)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    resultTransport = inserted;
  }

  // Sincronizar con Google Calendar
  if (resultTransport) {
    try {
      const { sincronizarTransporteACalendar } = await import("@/lib/google-calendar");
      await sincronizarTransporteACalendar(rest.project_id, resultTransport);
    } catch (err) {
      console.error("Google Calendar Sync error:", err);
    }
  }

  // Revalidar todas las pantallas afectadas
  revalidatePath("/transport");
  revalidatePath("/cashflow");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  revalidatePath("/proyecto");

  // Intentar sincronizar el flujo de caja a Google Drive
  try {
    const { exportarCashFlowADrive } = await import("@/lib/drive-sync");
    await exportarCashFlowADrive(rest.project_id);
  } catch (driveErr) {
    console.warn("Google Drive Sync error:", driveErr);
  }

  return { ok: true };
}

export async function eliminarTransporte(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  // Obtener los detalles del transporte para borrar también el cash_flow asociado y el evento del calendario
  const { data: trans } = await supabase
    .from("transport")
    .select("project_id, cash_flow_id")
    .eq("id", id)
    .maybeSingle();

  const projectId = trans?.project_id;
  const cashFlowId = trans?.cash_flow_id;

  // Borrar el transporte
  const { error } = await supabase.from("transport").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Borrar el flujo de caja asociado
  if (cashFlowId) {
    await supabase.from("cash_flow").delete().eq("id", cashFlowId);
  }

  // Borrar el evento en Google Calendar
  if (projectId) {
    try {
      const { eliminarEventoCalendar } = await import("@/lib/google-calendar");
      await eliminarEventoCalendar(projectId, id);
    } catch (err) {
      console.error("Google Calendar Sync error:", err);
    }
  }

  revalidatePath("/transport");
  revalidatePath("/cashflow");
  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  revalidatePath("/proyecto");

  if (projectId) {
    try {
      const { exportarCashFlowADrive } = await import("@/lib/drive-sync");
      await exportarCashFlowADrive(projectId);
    } catch (driveErr) {
      console.warn("Google Drive Sync error:", driveErr);
    }
  }

  return { ok: true };
}
