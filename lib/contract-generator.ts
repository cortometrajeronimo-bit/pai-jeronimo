import type { CrewMember, Project, ContractTemplate } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type RenderResult = {
  content: string;
  camposFaltantes: string[];
};

const ETIQUETAS: Record<string, string> = {
  cedula: "Cédula",
  email: "Email",
  telefono: "Teléfono",
  tarifa_diaria: "Tarifa diaria",
  eps: "EPS",
  rh: "Tipo de sangre",
};

// Reemplaza todas las variables {{clave}} con datos reales y reporta campos vacíos
export function renderTemplate(
  template: string,
  crew: CrewMember,
  project: Project
): RenderResult {
  const hoy = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const inicio = project.start_date
    ? format(new Date(project.start_date + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: es })
    : "";
  const fin = project.end_date
    ? format(new Date(project.end_date + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: es })
    : "";

  // Campos opcionales del crew — si son null, quedan en blanco (no "—")
  const opcionales: Record<string, string | null> = {
    cedula: crew.id_number,
    email: crew.email,
    telefono: crew.phone,
    tarifa_diaria: crew.daily_rate
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(crew.daily_rate)
      : null,
    eps: crew.eps,
    rh: crew.blood_type,
  };

  const camposFaltantes: string[] = [];
  for (const [key, val] of Object.entries(opcionales)) {
    if (val === null || val === "") camposFaltantes.push(ETIQUETAS[key] ?? key);
  }

  const vars: Record<string, string> = {
    nombre: crew.name,
    rol: crew.role,
    cedula: opcionales.cedula ?? "",
    email: opcionales.email ?? "",
    telefono: opcionales.telefono ?? "",
    tarifa_diaria: opcionales.tarifa_diaria ?? "",
    eps: opcionales.eps ?? "",
    rh: opcionales.rh ?? "",
    fecha_inicio: inicio,
    fecha_fin: fin,
    fecha_hoy: hoy,
    proyecto: project.name,
    ubicacion: project.location ?? "",
    presupuesto: project.budget_total
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(project.budget_total)
      : "",
  };

  const content = template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

  return { content, camposFaltantes };
}

export type LoteResult = {
  creados: number;
  errores: string[];
  advertencias: Record<string, string[]>; // crewName → camposFaltantes
};

// Genera contratos en lote para una lista de crew members
export async function generarContratosParaCrew(
  template: ContractTemplate,
  crew: CrewMember[],
  project: Project,
  guardarFn: (data: {
    project_id: string;
    name: string;
    type: ContractTemplate["type"];
    notes: string;
    status: "por_firmar";
  }) => Promise<{ ok: boolean; error?: string }>
): Promise<LoteResult> {
  let creados = 0;
  const errores: string[] = [];
  const advertencias: Record<string, string[]> = {};

  for (const miembro of crew) {
    const { content, camposFaltantes } = renderTemplate(template.content, miembro, project);

    if (camposFaltantes.length > 0) advertencias[miembro.name] = camposFaltantes;

    const r = await guardarFn({
      project_id: project.id,
      name: `${template.name} — ${miembro.name}`,
      type: template.type,
      notes: content,
      status: "por_firmar",
    });

    if (r.ok) creados++;
    else errores.push(`${miembro.name}: ${r.error ?? "error"}`);
  }

  return { creados, errores, advertencias };
}
