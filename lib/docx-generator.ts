// Generador de contratos a partir de una plantilla DOCX subida por el usuario.
//
// Dos modos de reemplazo, combinables:
//
// 1. **Placeholders** `{{nombre}}`, `{{cedula}}`, … reemplazados con docxtemplater.
//    Si el dato no existe, deja el texto literal "RELLENAR: CAMPO" en mayúsculas.
//
// 2. **Find/replace literal** cuando la plantilla es un contrato ya hecho de UNA
//    persona base (Ana Rangel) y queremos reutilizarla para otro crew: buscamos
//    los strings concretos de Ana (nombre, cédula, email…) y los reemplazamos
//    por los del crew target. Si el target no tiene el dato → "RELLENAR: CAMPO".
//
// Limitación conocida del modo 2: Word a veces parte un texto en varios runs
// XML cuando hay cambios de formato; en ese caso el match exacto puede fallar.
// El productor debe revisar el archivo antes de firmar.

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
  nombre: "nombre",
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

// Escapa caracteres con significado en XML para que find/replace no rompa el documento
function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Mapa de pares find→replace a aplicar literalmente sobre el XML.
// Solo se incluyen fields donde la persona base tiene valor no vacío;
// si el target tampoco lo tiene, el reemplazo deja "RELLENAR: CAMPO".
function construirPares(
  base: CrewMember,
  target: CrewMember,
  faltantes: string[]
): Array<[string, string]> {
  const pares: Array<[string, string]> = [];
  const campos: Array<{
    key: string;
    baseVal: string | null;
    targetVal: string | null;
  }> = [
    { key: "nombre", baseVal: base.name, targetVal: target.name },
    { key: "cedula", baseVal: base.id_number, targetVal: target.id_number },
    { key: "email", baseVal: base.email, targetVal: target.email },
    { key: "telefono", baseVal: base.phone, targetVal: target.phone },
    {
      key: "tarifa_diaria",
      baseVal: fmtCOP(base.daily_rate),
      targetVal: fmtCOP(target.daily_rate),
    },
    { key: "eps", baseVal: base.eps, targetVal: target.eps },
    { key: "rh", baseVal: base.blood_type, targetVal: target.blood_type },
  ];

  for (const c of campos) {
    if (!c.baseVal) continue; // no podemos buscar sin un string fuente
    const etiqueta = ETIQUETAS[c.key] ?? c.key;
    const replacement = c.targetVal ?? `RELLENAR: ${etiqueta.toUpperCase()}`;
    if (!c.targetVal && !faltantes.includes(etiqueta)) faltantes.push(etiqueta);
    pares.push([c.baseVal, replacement]);
  }
  return pares;
}

// Aplica find/replace sobre los XMLs principales del DOCX (documento, headers, footers).
function aplicarFindReplace(zip: PizZip, pares: Array<[string, string]>): void {
  const archivosRelevantes = Object.keys(zip.files).filter((n) =>
    /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/i.test(n)
  );
  for (const nombre of archivosRelevantes) {
    const file = zip.file(nombre);
    if (!file) continue;
    let xml = file.asText();
    for (const [from, to] of pares) {
      const fromXml = escXml(from);
      const toXml = escXml(to);
      if (xml.includes(fromXml)) {
        xml = xml.split(fromXml).join(toXml);
      }
    }
    zip.file(nombre, xml);
  }
}

// Genera un DOCX a partir del buffer de la plantilla y los datos del crew.
// `basePerson` es opcional: si se pasa, sus datos se reemplazan literalmente
// por los del crew target (find/replace) antes de procesar placeholders.
export function generarDocxContrato(
  plantillaBuffer: ArrayBuffer | Buffer,
  crew: CrewMember,
  project: Project,
  basePerson?: CrewMember | null
): DocxRenderResult {
  const data = construirVariables(crew, project);
  const faltantes: string[] = [];

  const zip = new PizZip(plantillaBuffer);

  // Paso 1: find/replace literal con datos de la persona base (si aplica)
  if (basePerson && basePerson.id !== crew.id) {
    const pares = construirPares(basePerson, crew, faltantes);
    if (pares.length > 0) aplicarFindReplace(zip, pares);
  }

  // Paso 2: placeholders {{...}} con docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part: { module?: string; value?: string; tag?: string }) => {
      if (part.module) return "";
      const tag = (part.value ?? part.tag ?? "").toString();
      const etiqueta = ETIQUETAS[tag] ?? tag;
      if (!faltantes.includes(etiqueta)) faltantes.push(etiqueta);
      return `RELLENAR: ${etiqueta.toUpperCase()}`;
    },
  });

  const renderData: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(data)) {
    renderData[k] = v ?? undefined;
  }

  doc.render(renderData);

  const buffer = doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
  return { buffer, camposFaltantes: faltantes };
}
