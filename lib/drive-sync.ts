// Sincronización bidireccional PAI (Supabase) ↔ Google Drive.
//
// Exporta las 4 tablas críticas a "PAI-Backup-JERONIMO" (una hoja con 4 pestañas).
// Las funciones de lectura sirven como fallback si Supabase no responde.
//
// Uso típico — exportar todo después de un cambio importante:
//   exportarTodoADrive(projectId).catch(console.warn)
//
// Uso fallback — crew page cuando Supabase falla:
//   const crew = await leerCrewDesdeDrive()

import { createClient } from "@/lib/supabase/server";
import {
  driveDisponible,
  obtenerOCrearBackupSheet,
  escribirTabEnSheet,
  leerTabDeSheet,
} from "@/lib/google-drive";

// ==================================================
// EXPORTAR PAI → DRIVE
// ==================================================

export async function exportarCrewADrive(projectId: string): Promise<void> {
  if (!driveDisponible()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("crew_members")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("name");
  if (!data?.length) return;

  const headers = [
    "ID", "Nombre", "Rol", "Email", "Teléfono", "Cédula", "RH", "EPS",
    "Contacto Emergencia", "Tel. Emergencia", "Restricciones Dieta",
    "Confirmado", "Tarifa Diaria", "Notas",
  ];
  const filas = data.map((c) => [
    c.id, c.name, c.role, c.email ?? "", c.phone ?? "", c.id_number ?? "",
    c.blood_type ?? "", c.eps ?? "", c.emergency_contact_name ?? "",
    c.emergency_contact_phone ?? "", c.dietary_restrictions ?? "",
    c.is_confirmed ? "Sí" : "No", c.daily_rate ?? "", c.notes ?? "",
  ]);

  const sheetId = await obtenerOCrearBackupSheet();
  await escribirTabEnSheet(sheetId, "Crew", [headers, ...filas]);
}

export async function exportarGastosADrive(projectId: string): Promise<void> {
  if (!driveDisponible()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("project_id", projectId)
    .order("date");
  if (!data?.length) return;

  const headers = ["ID", "Concepto", "Categoría", "Monto (COP)", "Fecha", "Estado"];
  const filas = data.map((e) => [
    e.id, e.concept, e.category, e.amount, e.date ?? "", e.status,
  ]);

  const sheetId = await obtenerOCrearBackupSheet();
  await escribirTabEnSheet(sheetId, "Presupuesto", [headers, ...filas]);
}

export async function exportarEquiposADrive(projectId: string): Promise<void> {
  if (!driveDisponible()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment")
    .select("*")
    .eq("project_id", projectId)
    .order("name");
  if (!data?.length) return;

  const headers = [
    "ID", "Nombre", "Categoría", "Marca", "Modelo",
    "Proveedor", "Unidades", "Estado", "Notas",
  ];
  const filas = data.map((e) => [
    e.id, e.name, e.category, e.brand ?? "", e.model ?? "",
    e.provider ?? "", e.units ?? 1, e.status, e.notes ?? "",
  ]);

  const sheetId = await obtenerOCrearBackupSheet();
  await escribirTabEnSheet(sheetId, "Equipos", [headers, ...filas]);
}

export async function exportarCashFlowADrive(projectId: string): Promise<void> {
  if (!driveDisponible()) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_flow")
    .select("*")
    .eq("project_id", projectId)
    .order("date");
  if (!data?.length) return;

  const headers = [
    "ID", "Fecha", "Concepto", "Tipo", "Monto (COP)",
    "Categoría", "Proyectado", "Notas",
  ];
  const filas = data.map((c) => [
    c.id, c.date, c.concept,
    c.type === "income" ? "Ingreso" : "Egreso",
    c.amount, c.category ?? "",
    c.is_projected ? "Sí" : "No",
    c.notes ?? "",
  ]);

  const sheetId = await obtenerOCrearBackupSheet();
  await escribirTabEnSheet(sheetId, "CashFlow", [headers, ...filas]);
}

// Exporta las 4 tablas en paralelo. Devuelve ok + timestamp para mostrar en UI.
export async function exportarTodoADrive(
  projectId: string
): Promise<{ ok: boolean; error?: string; timestamp?: string; sheetUrl?: string }> {
  if (!driveDisponible()) {
    return { ok: false, error: "Google Drive no está configurado (faltan credenciales)" };
  }
  try {
    const sheetId = await obtenerOCrearBackupSheet();
    await Promise.all([
      exportarCrewADrive(projectId),
      exportarGastosADrive(projectId),
      exportarEquiposADrive(projectId),
      exportarCashFlowADrive(projectId),
    ]);
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al exportar a Drive",
    };
  }
}

// ==================================================
// LEER DRIVE → FALLBACK (cuando Supabase no responde)
// ==================================================

type CrewFallback = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dietary_restrictions: string;
  is_confirmed: boolean;
};

// Lee la pestaña "Crew" del backup y devuelve filas compatibles con CrewMember.
// Usar solo cuando Supabase falla.
export async function leerCrewDesdeDrive(): Promise<CrewFallback[]> {
  if (!driveDisponible()) return [];
  try {
    const sheetId = await obtenerOCrearBackupSheet();
    const filas   = await leerTabDeSheet(sheetId, "Crew");
    if (filas.length < 2) return [];
    // headers: ID, Nombre, Rol, Email, Teléfono, Cédula, RH, EPS,
    //          Contacto Emergencia, Tel. Emergencia, Restricciones, Confirmado, ...
    return filas.slice(1).map((f) => ({
      id:                     f[0]  ?? "",
      name:                   f[1]  ?? "",
      role:                   f[2]  ?? "",
      email:                  f[3]  ?? "",
      phone:                  f[4]  ?? "",
      blood_type:             f[6]  ?? "",
      emergency_contact_name: f[8]  ?? "",
      emergency_contact_phone:f[9]  ?? "",
      dietary_restrictions:   f[10] ?? "",
      is_confirmed:           f[11] === "Sí",
    }));
  } catch {
    return [];
  }
}

type GastoFallback = {
  id: string;
  concept: string;
  category: string;
  amount: number;
  date: string;
  status: string;
};

// Lee la pestaña "Presupuesto" del backup.
export async function leerGastosDesdeDrive(): Promise<GastoFallback[]> {
  if (!driveDisponible()) return [];
  try {
    const sheetId = await obtenerOCrearBackupSheet();
    const filas   = await leerTabDeSheet(sheetId, "Presupuesto");
    if (filas.length < 2) return [];
    return filas.slice(1).map((f) => ({
      id:       f[0] ?? "",
      concept:  f[1] ?? "",
      category: f[2] ?? "",
      amount:   parseFloat(f[3] ?? "0") || 0,
      date:     f[4] ?? "",
      status:   f[5] ?? "",
    }));
  } catch {
    return [];
  }
}
