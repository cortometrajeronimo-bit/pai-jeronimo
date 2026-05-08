// RAG simple: búsqueda por keywords sobre drive_files.content_text
// Sin embeddings ni vector store — apto free tier y suficiente para corpus pequeño.

import { createClient } from "@/lib/supabase/server";

// Disparadores: si la pregunta incluye alguno, se hace búsqueda en Drive
const KEYWORDS_TRIGGER = [
  "documento",
  "documentos",
  "contrato",
  "contratos",
  "plan",
  "planificacion",
  "planificación",
  "presupuesto",
  "hoja",
  "sheet",
  "guion",
  "guión",
  "locacion",
  "locación",
  "cronograma",
  "minuta",
  "brief",
];

// Stop-words en español que no aportan al matching
const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "de", "del",
  "en", "para", "por", "con", "sin", "que", "qué", "cual", "cuál", "como", "cómo",
  "es", "son", "ser", "estar", "está", "están", "este", "esta", "estos", "estas",
  "se", "lo", "le", "les", "nos", "vos", "tu", "tú", "yo", "mi", "mí", "su",
  "a", "al", "ante", "bajo", "cabe", "contra", "desde", "durante", "entre",
  "hacia", "hasta", "mediante", "sobre", "tras", "no", "si", "sí",
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

// Busca chunks relevantes en drive_files.content_text para la pregunta dada.
// Retorna fragmentos con la fuente. Limit es número de archivos a consultar.
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

  if (!archivos || archivos.length === 0) return [];

  const tokens = tokenize(pregunta);
  if (tokens.length === 0) return [];

  // Score de cada archivo: número de coincidencias de tokens en su texto
  const scored = archivos
    .map((a) => {
      const texto = (a.content_text ?? "").toLowerCase();
      let score = 0;
      for (const t of tokens) {
        // contar ocurrencias del token (simple)
        const re = new RegExp(`\\b${t}\\b`, "gi");
        const matches = texto.match(re);
        if (matches) score += matches.length;
      }
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, maxChunks);

  // Extraer un fragmento de ~500 chars alrededor del primer match
  return scored.map(({ a }) => {
    const texto = a.content_text ?? "";
    const idxMin = tokens
      .map((t) => texto.toLowerCase().indexOf(t))
      .filter((i) => i >= 0)
      .reduce((min, i) => (i < min ? i : min), texto.length);
    const start = Math.max(0, idxMin - 100);
    const end = Math.min(texto.length, idxMin + 500);
    return {
      source: a.name,
      text: texto.slice(start, end).trim(),
    };
  });
}
