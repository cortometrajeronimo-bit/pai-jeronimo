"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Contract, ContractTemplate } from "@/lib/types";
import { traducirErrorSupabase } from "@/lib/supabase-errors";

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
): Promise<{ ok: boolean; creados: number; errores: string[] }> {
  if (!templateId || crewIds.length === 0 || !projectId) {
    return {
      ok: false,
      creados: 0,
      errores: ["Faltan datos: plantilla, crew o proyecto."],
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
      errores: ["No se encontraron datos necesarios"],
    };
  }

  const { generarContratosParaCrew } = await import("@/lib/contract-generator");

  const result = await generarContratosParaCrew(
    template,
    crewList,
    project,
    guardarContrato
  );

  revalidatePath("/contracts");
  return { ok: true, ...result };
}
