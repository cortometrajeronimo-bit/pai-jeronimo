"use server";

// Server actions para subir plantillas DOCX, subir contratos terminados,
// generar contratos en lote desde plantilla DOCX, marcar contratos como
// firmados y eliminar archivos asociados.
//
// Los archivos viven en Supabase Storage (buckets `contract-templates` y
// `contracts`). Las filas en BD guardan `storage_path` para descarga posterior.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { traducirErrorSupabase } from "@/lib/supabase-errors";
import type { Contract } from "@/lib/types";

type Resp<T = void> =
  | ({ ok: true } & (T extends void ? object : T))
  | { ok: false; error: string };

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ALLOWED_TERMINADO = new Set<string>([
  DOCX_MIME,
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const MAX_PLANTILLA = 5 * 1024 * 1024; // 5 MB
const MAX_TERMINADO = 10 * 1024 * 1024; // 10 MB

function validarNombreArchivo(name: string): boolean {
  return /^[\w\-. ()áéíóúÁÉÍÓÚñÑ]+$/.test(name) && name.length <= 120;
}

// =====================================================
// Subir plantilla DOCX con placeholders
// =====================================================
export async function subirPlantillaDOCX(
  formData: FormData
): Promise<Resp<{ id: string }>> {
  const file = formData.get("file") as File | null;
  const nombre = (formData.get("name") as string | null)?.trim() ?? "";
  const tipo = (formData.get("type") as string | null) ?? "talento";
  const projectId = (formData.get("project_id") as string | null) ?? "";

  if (!file) return { ok: false, error: "No se recibió ningún archivo." };
  if (!nombre) return { ok: false, error: "El nombre de la plantilla es obligatorio." };
  if (!projectId) return { ok: false, error: "Falta el proyecto." };
  if (file.size > MAX_PLANTILLA)
    return { ok: false, error: "El archivo supera 5 MB." };
  if (file.type !== DOCX_MIME && !file.name.toLowerCase().endsWith(".docx"))
    return { ok: false, error: "La plantilla debe ser un archivo .docx." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user)
    return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const id = randomUUID();
  const path = `${projectId}/${id}.docx`;

  const arrayBuf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("contract-templates")
    .upload(path, arrayBuf, { contentType: DOCX_MIME, upsert: false });
  if (upErr) return { ok: false, error: traducirErrorSupabase(upErr.message) };

  const { error: dbErr } = await supabase.from("contract_templates").insert({
    id,
    project_id: projectId,
    name: nombre,
    type: tipo as Contract["type"],
    content: "", // las DOCX no usan content de texto
    source_type: "docx",
    storage_path: path,
  });
  if (dbErr) {
    // Rollback storage si la BD falla
    await supabase.storage.from("contract-templates").remove([path]);
    return { ok: false, error: traducirErrorSupabase(dbErr.message) };
  }

  revalidatePath("/contracts");
  return { ok: true, id };
}

// =====================================================
// Subir contrato ya terminado (firmado o no) para archivar
// =====================================================
export async function subirContratoTerminado(
  formData: FormData
): Promise<Resp<{ id: string }>> {
  const file = formData.get("file") as File | null;
  const nombre = (formData.get("name") as string | null)?.trim() ?? "";
  const tipo = (formData.get("type") as string | null) ?? "talento";
  const projectId = (formData.get("project_id") as string | null) ?? "";
  const crewMemberId =
    (formData.get("crew_member_id") as string | null) || null;
  const yaFirmado = formData.get("signed") === "true";

  if (!file) return { ok: false, error: "No se recibió ningún archivo." };
  if (!nombre) return { ok: false, error: "El nombre del contrato es obligatorio." };
  if (!projectId) return { ok: false, error: "Falta el proyecto." };
  if (file.size > MAX_TERMINADO)
    return { ok: false, error: "El archivo supera 10 MB." };
  if (!ALLOWED_TERMINADO.has(file.type) && !validarExtensionTerminado(file.name))
    return {
      ok: false,
      error: "Formato no soportado. Usa .docx, .pdf, .png o .jpg.",
    };
  if (!validarNombreArchivo(file.name))
    return { ok: false, error: "El nombre del archivo tiene caracteres inválidos." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user)
    return { ok: false, error: "Sesión expirada. Inicia sesión de nuevo." };

  const id = randomUUID();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${projectId}/${id}.${ext}`;

  const arrayBuf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage
    .from("contracts")
    .upload(path, arrayBuf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: traducirErrorSupabase(upErr.message) };

  const { error: dbErr } = await supabase.from("contracts").insert({
    id,
    project_id: projectId,
    name: nombre,
    type: tipo as Contract["type"],
    status: yaFirmado ? "vigente" : "por_firmar",
    file_url: null,
    notes: null,
    origin: "uploaded",
    storage_path: path,
    mime_type: file.type || null,
    signed_at: yaFirmado ? new Date().toISOString() : null,
    crew_member_id: crewMemberId,
  });
  if (dbErr) {
    await supabase.storage.from("contracts").remove([path]);
    return { ok: false, error: traducirErrorSupabase(dbErr.message) };
  }

  revalidatePath("/contracts");
  return { ok: true, id };
}

function validarExtensionTerminado(name: string): boolean {
  return /\.(docx|pdf|png|jpe?g)$/i.test(name);
}

// =====================================================
// Generar contratos en lote desde una plantilla DOCX
// =====================================================
export async function generarContratosDOCXMasivo(
  templateId: string,
  crewIds: string[],
  projectId: string
): Promise<{
  ok: boolean;
  creados: number;
  errores: string[];
  advertencias: Record<string, string[]>;
}> {
  if (!templateId || crewIds.length === 0 || !projectId) {
    return {
      ok: false,
      creados: 0,
      errores: ["Faltan datos: plantilla, crew o proyecto."],
      advertencias: {},
    };
  }

  const supabase = await createClient();

  const { data: template } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  const { data: crewList } = await supabase
    .from("crew_members")
    .select("*")
    .in("id", crewIds);

  if (!template || !project || !crewList) {
    return {
      ok: false,
      creados: 0,
      errores: ["No se encontraron datos necesarios."],
      advertencias: {},
    };
  }
  if (template.source_type !== "docx" || !template.storage_path) {
    return {
      ok: false,
      creados: 0,
      errores: ["La plantilla no es DOCX o no tiene archivo asociado."],
      advertencias: {},
    };
  }

  // Descargar la plantilla una sola vez
  const { data: plantillaBlob, error: dlErr } = await supabase.storage
    .from("contract-templates")
    .download(template.storage_path);
  if (dlErr || !plantillaBlob) {
    return {
      ok: false,
      creados: 0,
      errores: [`No se pudo descargar la plantilla: ${dlErr?.message ?? "desconocido"}`],
      advertencias: {},
    };
  }
  const plantillaBuf = await plantillaBlob.arrayBuffer();

  const { generarDocxContrato } = await import("@/lib/docx-generator");

  let creados = 0;
  const errores: string[] = [];
  const advertencias: Record<string, string[]> = {};

  for (const miembro of crewList) {
    try {
      const { buffer, camposFaltantes } = generarDocxContrato(
        plantillaBuf,
        miembro,
        project
      );
      if (camposFaltantes.length > 0) advertencias[miembro.name] = camposFaltantes;

      const id = randomUUID();
      const path = `${projectId}/${id}.docx`;
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(path, buffer, { contentType: DOCX_MIME, upsert: false });
      if (upErr) {
        errores.push(`${miembro.name}: ${upErr.message}`);
        continue;
      }

      const { error: dbErr } = await supabase.from("contracts").insert({
        id,
        project_id: projectId,
        name: `${template.name} — ${miembro.name}`,
        type: template.type,
        status: "por_firmar",
        file_url: null,
        notes: null,
        origin: "template_docx",
        storage_path: path,
        mime_type: DOCX_MIME,
        missing_fields: camposFaltantes,
        crew_member_id: miembro.id,
      });
      if (dbErr) {
        await supabase.storage.from("contracts").remove([path]);
        errores.push(`${miembro.name}: ${dbErr.message}`);
        continue;
      }
      creados++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errores.push(`${miembro.name}: ${msg}`);
    }
  }

  revalidatePath("/contracts");
  return { ok: errores.length === 0, creados, errores, advertencias };
}

// =====================================================
// Marcar contrato como firmado / desmarcar
// =====================================================
export async function marcarContratoFirmado(
  id: string,
  firmado: boolean
): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contracts")
    .update({
      signed_at: firmado ? new Date().toISOString() : null,
      status: firmado ? "vigente" : "por_firmar",
    })
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/contracts");
  return { ok: true };
}

// =====================================================
// URL firmada temporal para descargar un archivo del bucket
// =====================================================
export async function obtenerUrlContrato(
  bucket: "contracts" | "contract-templates",
  path: string
): Promise<Resp<{ url: string }>> {
  if (!path) return { ok: false, error: "Falta la ruta del archivo." };
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 10); // 10 minutos
  if (error || !data?.signedUrl)
    return {
      ok: false,
      error: traducirErrorSupabase(error?.message ?? "URL no disponible"),
    };
  return { ok: true, url: data.signedUrl };
}

// =====================================================
// Eliminar contrato + su archivo en Storage si existe
// =====================================================
export async function eliminarContratoConArchivo(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("contracts")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (c?.storage_path) {
    await supabase.storage.from("contracts").remove([c.storage_path]);
  }
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/contracts");
  return { ok: true };
}

// =====================================================
// Eliminar plantilla DOCX + su archivo en Storage
// =====================================================
export async function eliminarPlantillaDOCX(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("contract_templates")
    .select("storage_path, source_type")
    .eq("id", id)
    .maybeSingle();

  if (t?.source_type === "docx" && t.storage_path) {
    await supabase.storage.from("contract-templates").remove([t.storage_path]);
  }
  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/contracts");
  return { ok: true };
}
