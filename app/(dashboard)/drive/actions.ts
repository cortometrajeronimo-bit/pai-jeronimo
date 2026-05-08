"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  listarArchivos,
  leerContenido,
  leerSheetComoFilas,
  driveDisponible,
} from "@/lib/google-drive";
import { exportarTodoADrive } from "@/lib/drive-sync";

// Sincroniza el listado de archivos de la carpeta raíz contra drive_files.
// Si Drive no está configurado, inserta los mocks (para que la UI sea probable).
export async function sincronizarDrive(projectId: string) {
  const supabase = await createClient();
  let archivos;
  try {
    archivos = await listarArchivos();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al listar Drive",
    };
  }

  let importados = 0;
  for (const f of archivos) {
    let contenido: string | null = null;
    if (driveDisponible()) {
      try {
        contenido = await leerContenido(f.id, f.mimeType);
      } catch (err) {
        // TODO: registrar errores parciales en una tabla de auditoría
        console.warn(`[drive] falló contenido de ${f.name}:`, err);
        contenido = null;
      }
    }

    // Upsert por (project_id, drive_file_id)
    const { error } = await supabase.from("drive_files").upsert(
      {
        project_id: projectId,
        drive_file_id: f.id,
        name: f.name,
        mime_type: f.mimeType,
        web_view_link: f.webViewLink ?? null,
        last_synced_at: new Date().toISOString(),
        content_text: contenido,
      },
      { onConflict: "project_id,drive_file_id" }
    );
    if (!error) importados++;
  }

  revalidatePath("/drive");
  revalidatePath("/dashboard");
  return { ok: true, importados, total: archivos.length, demo: !driveDisponible() };
}

// Importa una hoja de cálculo de Drive como movimientos a cash_flow / expenses.
// Espera columnas: concepto/concept, monto/amount, fecha/date, categoria/category, tipo/type
export async function importarSheetACashFlow(projectId: string, driveFileId: string) {
  if (!driveDisponible()) {
    return { ok: false, error: "Google Drive no está configurado (faltan credenciales)" };
  }

  let filas;
  try {
    filas = await leerSheetComoFilas(driveFileId);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al leer Sheet",
    };
  }

  const supabase = await createClient();
  const inserts = filas
    .map((f) => {
      const concept = f["concepto"] || f["concept"] || f["descripcion"] || "";
      const amountStr = f["monto"] || f["amount"] || f["valor"] || "0";
      const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
      const date =
        f["fecha"] || f["date"] || new Date().toISOString().slice(0, 10);
      const category = f["categoria"] || f["category"] || "produccion";
      const tipoRaw = (f["tipo"] || f["type"] || "egreso").toLowerCase();
      const type: "income" | "expense" = /ingreso|income/.test(tipoRaw)
        ? "income"
        : "expense";

      if (!concept || !amount || isNaN(amount)) return null;
      return {
        project_id: projectId,
        date: date.slice(0, 10),
        concept,
        type,
        amount,
        category,
        is_projected: false,
        notes: "Importado desde Google Sheets",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (inserts.length === 0) {
    return { ok: false, error: "No se pudieron parsear filas válidas" };
  }

  const { error } = await supabase.from("cash_flow").insert(inserts);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/cashflow");
  revalidatePath("/drive");
  return { ok: true, importados: inserts.length };
}

// Exporta las 4 tablas críticas de Supabase al spreadsheet de backup en Drive.
export async function exportarADrive(projectId: string) {
  return exportarTodoADrive(projectId);
}

// Borrar referencia local (no toca el archivo real en Drive)
export async function eliminarDriveFile(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("drive_files").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/drive");
  return { ok: true };
}
