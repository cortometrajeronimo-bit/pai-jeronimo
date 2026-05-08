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
  obtenerOCrearSubcarpeta,
  crearSpreadsheetEnCarpeta,
  buscarArchivoEnCarpeta,
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
// IMPORTAR DRIVE → PAI (sincronización activa)
// Lee el backup sheet y hace upsert en Supabase.
// Filas con ID existente → actualiza. Filas sin ID → inserta como nueva.
// ==================================================

type ResultadoImport = { nuevos: number; actualizados: number; errores: number };

export async function importarCrewDesdeDrive(
  projectId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { nuevos: 0, actualizados: 0, errores: 0 };
  if (!driveDisponible()) return resultado;

  const supabase = await createClient();
  const sheetId  = await obtenerOCrearBackupSheet();
  const filas    = await leerTabDeSheet(sheetId, "Crew");
  // Columnas: ID(0) Nombre(1) Rol(2) Email(3) Tel(4) Cédula(5) RH(6) EPS(7)
  //           ContactoEmerg(8) TelEmerg(9) Restricciones(10) Confirmado(11)
  //           TarifaDiaria(12) Notas(13)
  const datos = filas.slice(1).filter((f) => f[1]?.trim() && f[2]?.trim());

  for (const f of datos) {
    const id    = f[0]?.trim();
    const fila  = {
      project_id:              projectId,
      name:                    f[1]?.trim() ?? "",
      role:                    f[2]?.trim() ?? "",
      email:                   f[3]?.trim() || null,
      phone:                   f[4]?.trim() || null,
      id_number:               f[5]?.trim() || null,
      blood_type:              f[6]?.trim() || null,
      eps:                     f[7]?.trim() || null,
      emergency_contact_name:  f[8]?.trim() || null,
      emergency_contact_phone: f[9]?.trim() || null,
      dietary_restrictions:    f[10]?.trim() || null,
      is_confirmed:            f[11] === "Sí",
      daily_rate:              parseFloat(f[12] ?? "") || null,
      notes:                   f[13]?.trim() || null,
      is_active:               true,
    };

    if (id && id.length === 36) {
      // UUID válido → actualizar registro existente
      const { error } = await supabase.from("crew_members").update(fila).eq("id", id);
      if (error) resultado.errores++;
      else resultado.actualizados++;
    } else {
      // Sin ID o ID inválido → insertar como nuevo miembro
      const { error } = await supabase.from("crew_members").insert(fila);
      if (error) resultado.errores++;
      else resultado.nuevos++;
    }
  }
  return resultado;
}

export async function importarGastosDesdeDrive(
  projectId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { nuevos: 0, actualizados: 0, errores: 0 };
  if (!driveDisponible()) return resultado;

  const supabase = await createClient();
  const sheetId  = await obtenerOCrearBackupSheet();
  const filas    = await leerTabDeSheet(sheetId, "Presupuesto");
  // Columnas: ID(0) Concepto(1) Categoría(2) Monto(3) Fecha(4) Estado(5)
  const datos = filas.slice(1).filter((f) => f[1]?.trim());

  for (const f of datos) {
    const id   = f[0]?.trim();
    const fila = {
      project_id: projectId,
      concept:    f[1]?.trim() ?? "",
      category:   f[2]?.trim() || "produccion",
      amount:     parseFloat(f[3] ?? "0") || 0,
      date:       f[4]?.slice(0, 10) || null,
      status:     f[5]?.trim() || "planeado",
    };

    if (id && id.length === 36) {
      const { error } = await supabase.from("expenses").update(fila).eq("id", id);
      if (error) resultado.errores++;
      else resultado.actualizados++;
    } else {
      const { error } = await supabase.from("expenses").insert(fila);
      if (error) resultado.errores++;
      else resultado.nuevos++;
    }
  }
  return resultado;
}

export async function importarEquiposDesdeDrive(
  projectId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { nuevos: 0, actualizados: 0, errores: 0 };
  if (!driveDisponible()) return resultado;

  const supabase = await createClient();
  const sheetId  = await obtenerOCrearBackupSheet();
  const filas    = await leerTabDeSheet(sheetId, "Equipos");
  // Columnas: ID(0) Nombre(1) Categoría(2) Marca(3) Modelo(4) Proveedor(5) Unidades(6) Estado(7) Notas(8)
  const datos = filas.slice(1).filter((f) => f[1]?.trim());

  for (const f of datos) {
    const id   = f[0]?.trim();
    const fila = {
      project_id: projectId,
      name:       f[1]?.trim() ?? "",
      category:   f[2]?.trim() || "otros",
      brand:      f[3]?.trim() || null,
      model:      f[4]?.trim() || null,
      provider:   f[5]?.trim() || null,
      units:      parseInt(f[6] ?? "1") || 1,
      status:     f[7]?.trim() || "disponible",
      notes:      f[8]?.trim() || null,
    };

    if (id && id.length === 36) {
      const { error } = await supabase.from("equipment").update(fila).eq("id", id);
      if (error) resultado.errores++;
      else resultado.actualizados++;
    } else {
      const { error } = await supabase.from("equipment").insert(fila);
      if (error) resultado.errores++;
      else resultado.nuevos++;
    }
  }
  return resultado;
}

export async function importarCashFlowDesdeDrive(
  projectId: string
): Promise<ResultadoImport> {
  const resultado: ResultadoImport = { nuevos: 0, actualizados: 0, errores: 0 };
  if (!driveDisponible()) return resultado;

  const supabase = await createClient();
  const sheetId  = await obtenerOCrearBackupSheet();
  const filas    = await leerTabDeSheet(sheetId, "CashFlow");
  // Columnas: ID(0) Fecha(1) Concepto(2) Tipo(3) Monto(4) Categoría(5) Proyectado(6) Notas(7)
  const datos = filas.slice(1).filter((f) => f[2]?.trim());

  for (const f of datos) {
    const id      = f[0]?.trim();
    const tipoRaw = (f[3] ?? "").toLowerCase();
    const fila    = {
      project_id:   projectId,
      date:         f[1]?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      concept:      f[2]?.trim() ?? "",
      type:         tipoRaw.includes("ingreso") ? "income" : "expense" as "income" | "expense",
      amount:       parseFloat(f[4] ?? "0") || 0,
      category:     f[5]?.trim() || null,
      is_projected: f[6] === "Sí",
      notes:        f[7]?.trim() || null,
    };

    if (id && id.length === 36) {
      const { error } = await supabase.from("cash_flow").update(fila).eq("id", id);
      if (error) resultado.errores++;
      else resultado.actualizados++;
    } else {
      const { error } = await supabase.from("cash_flow").insert(fila);
      if (error) resultado.errores++;
      else resultado.nuevos++;
    }
  }
  return resultado;
}

export type ResultadoImportTotal = {
  ok: boolean;
  error?: string;
  crew?: ResultadoImport;
  gastos?: ResultadoImport;
  equipos?: ResultadoImport;
  cashflow?: ResultadoImport;
  sheetUrl?: string;
};

export async function importarTodoDesdeDrive(
  projectId: string
): Promise<ResultadoImportTotal> {
  if (!driveDisponible()) {
    return { ok: false, error: "Google Drive no está configurado" };
  }
  try {
    const sheetId = await obtenerOCrearBackupSheet();
    const [crew, gastos, equipos, cashflow] = await Promise.all([
      importarCrewDesdeDrive(projectId),
      importarGastosDesdeDrive(projectId),
      importarEquiposDesdeDrive(projectId),
      importarCashFlowDesdeDrive(projectId),
    ]);
    return {
      ok: true,
      crew, gastos, equipos, cashflow,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al importar" };
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

// ==================================================
// BACKUP DIARIO — crea snapshot fechado en /backups
// ==================================================

// Fecha en formato YYYY-MM-DD con zona horaria Colombia (UTC-5)
function fechaColombia(): string {
  const now = new Date();
  // Ajustar a UTC-5
  const col = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return col.toISOString().slice(0, 10);
}

export type ResultadoBackup = {
  ok: boolean;
  nombre?: string;
  url?: string;
  filas?: { crew: number; gastos: number; equipos: number; cashflow: number };
  error?: string;
};

export async function crearBackupDiario(projectId: string): Promise<ResultadoBackup> {
  if (!driveDisponible()) {
    return { ok: false, error: "Google Drive no configurado" };
  }
  try {
    const supabase       = await createClient();
    const folderId       = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    const fecha          = fechaColombia();
    const nombre         = `backup-${fecha}`;
    const backupFolderId = await obtenerOCrearSubcarpeta("backups", folderId);

    // Si ya existe el backup de hoy no crear otro (evita duplicados si el cron se dispara 2 veces)
    const existente = await buscarArchivoEnCarpeta(nombre, backupFolderId);
    if (existente) {
      return {
        ok: true,
        nombre,
        url: `https://docs.google.com/spreadsheets/d/${existente}`,
        filas: { crew: 0, gastos: 0, equipos: 0, cashflow: 0 },
      };
    }

    // Leer las 4 tablas de Supabase en paralelo
    const [crewData, gastosData, equiposData, cashflowData] = await Promise.all([
      supabase.from("crew_members").select("*").eq("project_id", projectId).eq("is_active", true).order("name"),
      supabase.from("expenses").select("*").eq("project_id", projectId).order("date"),
      supabase.from("equipment").select("*").eq("project_id", projectId).order("name"),
      supabase.from("cash_flow").select("*").eq("project_id", projectId).order("date"),
    ]);

    const crew     = crewData.data     ?? [];
    const gastos   = gastosData.data   ?? [];
    const equipos  = equiposData.data  ?? [];
    const cashflow = cashflowData.data ?? [];

    // Crear spreadsheet fechado en /backups
    const sheetId = await crearSpreadsheetEnCarpeta(
      nombre,
      ["Crew", "Presupuesto", "Equipos", "CashFlow"],
      backupFolderId
    );

    // Escribir las 4 pestañas
    await Promise.all([
      escribirTabEnSheet(sheetId, "Crew", [
        ["ID", "Nombre", "Rol", "Email", "Teléfono", "Cédula", "RH", "EPS",
         "Contacto Emergencia", "Tel. Emergencia", "Restricciones", "Confirmado", "Tarifa Diaria", "Notas"],
        ...crew.map((c) => [
          c.id, c.name, c.role, c.email ?? "", c.phone ?? "", c.id_number ?? "",
          c.blood_type ?? "", c.eps ?? "", c.emergency_contact_name ?? "",
          c.emergency_contact_phone ?? "", c.dietary_restrictions ?? "",
          c.is_confirmed ? "Sí" : "No", c.daily_rate ?? "", c.notes ?? "",
        ]),
      ]),
      escribirTabEnSheet(sheetId, "Presupuesto", [
        ["ID", "Concepto", "Categoría", "Monto (COP)", "Fecha", "Estado"],
        ...gastos.map((e) => [e.id, e.concept, e.category, e.amount, e.date ?? "", e.status]),
      ]),
      escribirTabEnSheet(sheetId, "Equipos", [
        ["ID", "Nombre", "Categoría", "Marca", "Modelo", "Proveedor", "Unidades", "Estado", "Notas"],
        ...equipos.map((e) => [
          e.id, e.name, e.category, e.brand ?? "", e.model ?? "",
          e.provider ?? "", e.units ?? 1, e.status, e.notes ?? "",
        ]),
      ]),
      escribirTabEnSheet(sheetId, "CashFlow", [
        ["ID", "Fecha", "Concepto", "Tipo", "Monto (COP)", "Categoría", "Proyectado", "Notas"],
        ...cashflow.map((c) => [
          c.id, c.date, c.concept,
          c.type === "income" ? "Ingreso" : "Egreso",
          c.amount, c.category ?? "", c.is_projected ? "Sí" : "No", c.notes ?? "",
        ]),
      ]),
    ]);

    return {
      ok: true,
      nombre,
      url: `https://docs.google.com/spreadsheets/d/${sheetId}`,
      filas: {
        crew:     crew.length,
        gastos:   gastos.length,
        equipos:  equipos.length,
        cashflow: cashflow.length,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error en backup diario" };
  }
}
