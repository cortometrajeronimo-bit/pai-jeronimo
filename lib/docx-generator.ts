// Generador de contratos a partir de una plantilla DOCX subida por el usuario.
// Reemplaza placeholders `{{nombre}}`, `{{cedula}}`, etc. usando docxtemplater.
// Si el dato no existe, deja el texto literal "RELLENAR: CAMPO" en mayúsculas
// para que el productor lo complete a mano antes de firmar.

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CrewMember, Project } from "./types";

const ETIQUETAS: Record<string, string> = {
  cedula: "cédula",
  email: "email",
  telefono: "teléfono",
  tarifa_diaria: "tarifa diaria",
  eps: "EPS",
  rh: "tipo de sangre",
};

export type DocxRenderResult = {
  buffer: Buffer;
  camposFaltantes: string[];
};

function fmtCOP(n: number | null) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtFechaLarga(iso: string | null) {
  if (!iso) return null;
  return format(new Date(iso + "T12:00:00"), "d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
}

// Construye el mapa de variables del crew + proyecto.
// Campos opcionales nulos se dejan `null` para que el `nullGetter` los marque.
function construirVariables(
  crew: CrewMember,
  project: Project
): Record<string, string | null> {
  const tarifa = fmtCOP(crew.daily_rate);
  return {
    nombre: crew.name,
    rol: crew.role,
    cedula: crew.id_number,
    email: crew.email,
    telefono: crew.phone,
    tarifa_diaria: tarifa,
    eps: crew.eps,
    rh: crew.blood_type,
    fecha_inicio: fmtFechaLarga(project.start_date),
    fecha_fin: fmtFechaLarga(project.end_date),
    fecha_hoy: format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es }),
    proyecto: project.name,
    ubicacion: project.location,
    presupuesto: fmtCOP(project.budget_total),
  };
}

// Genera un DOCX a partir del buffer de la plantilla y los datos del crew.
// Devuelve el buffer del archivo y la lista de campos que quedaron sin rellenar.
export function generarDocxContrato(
  plantillaBuffer: ArrayBuffer | Buffer,
  crew: CrewMember,
  project: Project
): DocxRenderResult {
  const data = construirVariables(crew, project);
  const faltantes: string[] = [];

  const zip = new PizZip(plantillaBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Cuando una variable es null/undefined, deja un marcador en mayúsculas
    // y registra el campo en `faltantes` para alertar al usuario.
    nullGetter: (part: { module?: string; value?: string; tag?: string }) => {
      if (part.module) return ""; // loops/condiciones
      const tag = (part.value ?? part.tag ?? "").toString();
      const etiqueta = ETIQUETAS[tag] ?? tag;
      if (!faltantes.includes(etiqueta)) faltantes.push(etiqueta);
      return `RELLENAR: ${etiqueta.toUpperCase()}`;
    },
  });

  // Pasamos solo strings (docxtemplater convierte null/undefined → nullGetter)
  const renderData: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(data)) {
    renderData[k] = v ?? undefined;
  }

  doc.render(renderData);

  const buffer = doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  return { buffer, camposFaltantes: faltantes };
}
