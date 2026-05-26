"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Contract, ContractTemplate } from "@/lib/types";
import { traducirErrorSupabase } from "@/lib/supabase-errors";
import { enviarEmailConAdjunto } from "@/lib/email";

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

type Resp = { ok: true } | { ok: false; error: string };

export async function guardarContrato(data: ContractInput): Promise<Resp> {
  if (!data.project_id) return { ok: false, error: "Falta el proyecto." };
  if (!data.name?.trim()) return { ok: false, error: "El nombre del contrato es obligatorio." };

  const supabase = await createClient();
  const { id, ...rest } = data;
  const payload = { ...rest, name: rest.name.trim() };

  if (id) {
    const { error } = await supabase
      .from("contracts")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  } else {
    const { error } = await supabase.from("contracts").insert(payload);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  }
  revalidatePath("/contracts");
  return { ok: true };
}

export async function eliminarContrato(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/contracts");
  return { ok: true };
}

// — Plantillas —

export type TemplateInput = {
  id?: string;
  project_id: string;
  name: string;
  type: ContractTemplate["type"];
  content: string;
};

export async function guardarPlantilla(data: TemplateInput): Promise<Resp> {
  if (!data.project_id) return { ok: false, error: "Falta el proyecto." };
  if (!data.name?.trim() || !data.content?.trim())
    return { ok: false, error: "Nombre y contenido son obligatorios." };

  const supabase = await createClient();
  const { id, ...rest } = data;
  const payload = { ...rest, name: rest.name.trim() };

  if (id) {
    const { error } = await supabase
      .from("contract_templates")
      .update(payload)
      .eq("id", id);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  } else {
    const { error } = await supabase.from("contract_templates").insert(payload);
    if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  }
  revalidatePath("/contracts");
  return { ok: true };
}

export async function eliminarPlantilla(id: string): Promise<Resp> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: traducirErrorSupabase(error.message) };
  revalidatePath("/contracts");
  return { ok: true };
}

// Genera contratos individuales para cada crew member seleccionado desde una plantilla.
// La plantilla puede ser del proyecto o del sistema (project_id null = legales CO).
export async function generarDesdeTemplate(
  templateId: string,
  crewIds: string[],
  projectId: string
): Promise<{ ok: boolean; creados: number; errores: string[]; advertencias: Record<string, string[]> }> {
  if (!templateId || crewIds.length === 0 || !projectId) {
    return { ok: false, creados: 0, errores: ["Faltan datos: plantilla, crew o proyecto."], advertencias: {} };
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
    return { ok: false, creados: 0, errores: ["No se encontraron datos necesarios"], advertencias: {} };
  }

  const { generarContratosParaCrew } = await import("@/lib/contract-generator");

  const result = await generarContratosParaCrew(template, crewList, project, guardarContrato);

  revalidatePath("/contracts");
  return { ok: true, ...result };
}

// Envía un contrato generado al email del crew o del proyecto
export async function enviarContratoPorEmail(
  contractId: string,
  destino: "crew" | "proyecto"
): Promise<Resp> {
  const supabase = await createClient();

  const { data: contrato } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (!contrato) return { ok: false, error: "Contrato no encontrado." };
  if (!contrato.notes) return { ok: false, error: "Este contrato no tiene contenido generado." };

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", contrato.project_id)
    .single();

  const proyectoNombre = project?.name ?? "JERÓNIMO";

  // Determinar el email destino
  let emailDestino: string;
  if (destino === "proyecto") {
    emailDestino = process.env.GMAIL_USER ?? "";
    if (!emailDestino) return { ok: false, error: "No hay email del proyecto configurado." };
  } else {
    // Intenta encontrar el crew member por nombre en el contrato (formato "Plantilla — Nombre")
    const partes = contrato.name.split(" — ");
    const nombreCrew = partes[partes.length - 1]?.trim();
    const { data: crew } = await supabase
      .from("crew_members")
      .select("name, email")
      .ilike("name", nombreCrew ?? "")
      .eq("project_id", contrato.project_id)
      .maybeSingle();

    if (!crew?.email) {
      return {
        ok: false,
        error: `No hay email registrado para "${nombreCrew ?? "esta persona"}". Actualiza el perfil en /equipo.`,
      };
    }
    emailDestino = crew.email;
  }

  // Generar PDF en servidor
  const { pdf } = await import("@react-pdf/renderer");
  const { ContractPDFDoc } = await import("@/components/contracts/ContractPDF");
  const React = await import("react");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const element = React.default.createElement(ContractPDFDoc, {
    contrato: contrato as Contract,
    proyecto: proyectoNombre,
  }) as any;
  const blob = await (pdf as any)(element).toBlob();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const buffer = Buffer.from(await blob.arrayBuffer());

  const nombreArchivo = `${contrato.name.replace(/[^\w\s\-]/g, "").slice(0, 60)}.pdf`;

  await enviarEmailConAdjunto({
    to: emailDestino,
    subject: `Contrato para firma — ${contrato.name} · ${proyectoNombre}`,
    html: `
      <p>Hola,</p>
      <p>Adjunto encontrarás el contrato <strong>${contrato.name}</strong> generado desde la plataforma P.A.I. para el proyecto <strong>${proyectoNombre}</strong>.</p>
      <p>Por favor revisa, firma y devuelve el documento a la producción.</p>
      <br/>
      <p style="font-size:11px;color:#888888;">Este correo fue enviado automáticamente por P.A.I. No constituye asesoría jurídica. Si tienes dudas sobre el contenido del contrato, consulta con un abogado.</p>
    `,
    attachments: [{ filename: nombreArchivo, content: buffer }],
  });

  return { ok: true };
}
