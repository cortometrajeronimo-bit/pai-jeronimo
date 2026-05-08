// Mapeo central de roles → departamento del crew JERÓNIMO
// Útil para filtros, agrupación en call sheets y reportes

export type Departamento =
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
  { depto: "Producción", patron: /produc(tor|ción|cion)|asist.*prod|prod.*campo/i },
  { depto: "Dirección", patron: /director|asist.*dir|script/i },
  { depto: "Fotografía", patron: /dp|fot[oó]graf|asist.*fot|data|dit/i },
  { depto: "Iluminación", patron: /gaffer|lumino|electr[ií]c|ilum/i },
  { depto: "Arte", patron: /arte|vestuar|maquillaj|escenograf|util/i },
  { depto: "Sonido", patron: /sonid|microfon|boom/i },
  { depto: "Post-producción", patron: /montaj|colorist|edit|post/i },
  { depto: "Elenco", patron: /actor|actriz|elenco|extra|protag/i },
];

export function departamentoDeRol(rol: string | null | undefined): Departamento {
  if (!rol) return "Otros";
  for (const r of REGLAS) if (r.patron.test(rol)) return r.depto;
  return "Otros";
}

export const DEPARTAMENTOS: Departamento[] = [
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
