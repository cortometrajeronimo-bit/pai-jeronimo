// Mapeo central de roles → departamento del crew JERÓNIMO
// Útil para filtros, agrupación en call sheets y reportes

export type Departamento =
  | "Cabezas de Departamento"
  | "Producción"
  | "Dirección"
  | "Fotografía"
  | "Iluminación"
  | "Arte"
  | "Sonido"
  | "Post-producción"
  | "Elenco"
  | "Otros";

const REGLAS: Array<{ depto: Departamento; patron: RegExp }> = [
  // Producción (primero para no confundir con "director de producción")
  { depto: "Producción", patron: /produc(tor|tora|ción|cion)|asist.*prod|prod.*campo/i },
  // Cabezas específicas → mapean al departamento correcto, NO a Dirección
  { depto: "Arte",            patron: /director[a]?.*de.*arte|jef[ae].*de.*arte/i },
  { depto: "Fotografía",      patron: /director[a]?.*de.*fot|jef[ae].*de.*fot|director[a]?.*foto/i },
  { depto: "Iluminación",     patron: /director[a]?.*de.*ilum|jef[ae].*de.*ilum|director[a]?.*de.*luz/i },
  { depto: "Sonido",          patron: /director[a]?.*de.*son|jef[ae].*de.*son/i },
  { depto: "Post-producción", patron: /director[a]?.*de.*post|jef[ae].*de.*post/i },
  // Cabeza genérica: "director de X" o "jefe de X" sin depto específico
  { depto: "Cabezas de Departamento", patron: /director[a]?\s+de\s+\w+|jef[ae]\s+de\s+\w+/i },
  // Director general del proyecto / asistente de dirección / script
  { depto: "Dirección",       patron: /^director[a]?$|asist.*dir|script/i },
  // Técnicos por área
  { depto: "Fotografía",      patron: /\bdp\b|fot[oó]graf|asist.*fot|data|dit/i },
  { depto: "Iluminación",     patron: /gaffer|lumino|electr[ií]c|ilum/i },
  { depto: "Arte",            patron: /\barte\b|vestuar|maquillaj|escenograf|utileri/i },
  { depto: "Sonido",          patron: /sonid|microfon|boom/i },
  { depto: "Post-producción", patron: /montaj|colorist|edici[oó]n|post.produc/i },
  { depto: "Elenco",          patron: /actor|actriz|elenco|extra|protag/i },
];

export function departamentoDeRol(rol: string | null | undefined): Departamento {
  if (!rol) return "Otros";
  for (const r of REGLAS) if (r.patron.test(rol)) return r.depto;
  return "Otros";
}

export const DEPARTAMENTOS: Departamento[] = [
  "Cabezas de Departamento",
  "Producción",
  "Dirección",
  "Fotografía",
  "Iluminación",
  "Arte",
  "Sonido",
  "Post-producción",
  "Elenco",
  "Otros",
];
