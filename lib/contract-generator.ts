import type { CrewMember, Project, ContractTemplate } from "./types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Reemplaza todas las variables {{clave}} en la plantilla con los datos reales
export function renderTemplate(
  template: string,
  crew: CrewMember,
  project: Project
): string {
  const hoy = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const inicio = project.start_date
    ? format(new Date(project.start_date + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: es })
    : "—";
  const fin = project.end_date
    ? format(new Date(project.end_date + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: es })
    : "—";

  const vars: Record<string, string> = {
    nombre: crew.name,
    rol: crew.role,
    cedula: crew.id_number ?? "—",
    email: crew.email ?? "—",
    telefono: crew.phone ?? "—",
    tarifa_diaria: crew.daily_rate
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(crew.daily_rate)
      : "—",
    eps: crew.eps ?? "—",
    rh: crew.blood_type ?? "—",
    fecha_inicio: inicio,
    fecha_fin: fin,
    fecha_hoy: hoy,
    proyecto: project.name,
    ubicacion: project.location ?? "—",
    presupuesto: project.budget_total
      ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(project.budget_total)
      : "—",
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

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
): Promise<{ creados: number; errores: string[] }> {
  let creados = 0;
  const errores: string[] = [];

  for (const miembro of crew) {
    const contenido = renderTemplate(template.content, miembro, project);
    const r = await guardarFn({
      project_id: project.id,
      name: `${template.name} — ${miembro.name}`,
      type: template.type,
      notes: contenido,
      status: "por_firmar",
    });

    if (r.ok) creados++;
    else errores.push(`${miembro.name}: ${r.error ?? "error"}`);
  }

  return { creados, errores };
}
