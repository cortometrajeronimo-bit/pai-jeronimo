// RAG simple por keywords sobre drive_files.content_text — sin embeddings, free tier.
import { createClient } from "@/lib/supabase/server";

const KEYWORDS_TRIGGER = [
  "documento", "documentos", "contrato", "contratos", "plan", "planificacion",
  "planificación", "presupuesto", "hoja", "sheet", "guion", "guión",
  "locacion", "locación", "cronograma", "minuta", "brief",
];

const STOP_WORDS = new Set([
  "el","la","los","las","un","una","y","o","de","del","en","para","por","con",
  "que","como","es","son","se","lo","le","nos","tu","yo","mi","su","al","no","si",
]);

export function debeUsarRAG(pregunta: string): boolean {
  const m = pregunta.toLowerCase();
  return KEYWORDS_TRIGGER.some((k) => m.includes(k));
}

function tokenize(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^\wáéíóúñü\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3 && !STOP_WORDS.has(t));
}

export async function buscarContextoDrive(
  projectId: string,
  pregunta: string,
  maxChunks = 3
): Promise<{ source: string; text: string }[]> {
  const supabase = await createClient();
  const { data: archivos } = await supabase
    .from("drive_files")
    .select("name, content_text")
    .eq("project_id", projectId)
    .not("content_text", "is", null);

  if (!archivos?.length) return [];

  const tokens = tokenize(pregunta);
  if (!tokens.length) return [];

  const scored = archivos
    .map((a) => {
      const texto = (a.content_text ?? "").toLowerCase();
      let score = 0;
      for (const t of tokens) {
        const matches = texto.match(new RegExp(`\\b${t}\\b`, "gi"));
        if (matches) score += matches.length;
      }
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, maxChunks);

  return scored.map(({ a }) => {
    const texto = a.content_text ?? "";
    const idxMin = tokens
      .map((t) => texto.toLowerCase().indexOf(t))
      .filter((i) => i >= 0)
      .reduce((min, i) => (i < min ? i : min), texto.length);
    const start = Math.max(0, idxMin - 80);
    const end = Math.min(texto.length, idxMin + 350);
    return { source: a.name, text: texto.slice(start, end).trim() };
  });
}
