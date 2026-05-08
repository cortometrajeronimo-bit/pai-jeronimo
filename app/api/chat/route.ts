import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { debeUsarRAG, buscarContextoDrive } from "@/lib/rag";

const SYSTEM_PROMPT = `Eres P.A.I., asistente de producción del cortometraje "JERÓNIMO" (rodaje 4-10 jun 2026, Tuluá Colombia, 19 crew, $9.54M COP).
Tienes acceso a documentos del proyecto en Google Drive. Si recibes un bloque CONTEXTO, úsalo como fuente y cita el archivo entre paréntesis.
Responde en español, sé conciso y práctico. Si algo está fuera del proyecto, redirige amablemente.`;

// Cliente singleton — no reinstanciar en cada request
const groqClient = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;

const MODELO = "llama-3.3-70b-versatile";
const MODELO_FALLBACK = "llama-3.1-8b-instant";

type Mensaje = { role: "user" | "assistant"; content: string };

function respuestaDemo(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (/call ?sheet|llamado/.test(m))
    return "Genera el PDF desde la pestaña *Call Sheets*. Incluye llamado 06:00, crew por departamento, notas de seguridad y plan B clima. _(Modo demo — agrega GROQ_API_KEY para IA real)_";
  if (/presupuesto|gasto|costo|cop\b/.test(m))
    return "Presupuesto JERÓNIMO: $9.54M COP. Producción $5.91M · Post $2.9M · Pre $412k · Desarrollo $318k. Registra cada gasto el mismo día. _(Modo demo)_";
  if (/equipo|c[áa]mara|lente|luz|sonido|red\b|aputure/.test(m))
    return "Equipos UAO: RED Gemini, ARRI 1000W, Aputure, MixPre-6, Sennheiser MKH-416. Revisa estado en pestaña *Equipos*. _(Modo demo)_";
  if (/crew|personal|productor|director/.test(m))
    return "Crew JERÓNIMO: 19 personas. Producción: Manuelita, Daniel Q., Daniel R. Dirección: Alejandro V., Santiago, Natalia. ⚠ Natalia: sin cebolla ni maní. _(Modo demo)_";
  if (/locaci[óo]n|tulu[áa]|set/.test(m))
    return "Locación: Tuluá, Valle del Cauca. Confirma permisos por escrito, contacto del responsable, parqueadero y hospital más cercano. _(Modo demo)_";
  if (/seguridad|emergencia|botiqu[íi]n/.test(m))
    return "Botiquín en set cada día. Lista de EPS en pestaña *Crew*. Reunión de seguridad 5 min antes del primer plano. _(Modo demo)_";
  if (/hola|buenos|buenas|saludos/.test(m))
    return "¡Hola! Soy P.A.I. en modo demo. Puedo orientarte sobre call sheets, presupuesto, equipos, crew y locaciones. _(Agrega GROQ_API_KEY para IA real)_";
  return "Soy P.A.I. en modo demo. Agrega `GROQ_API_KEY` en `.env.local` para respuestas con IA real. ¿En qué te ayudo con JERÓNIMO?";
}

async function llamarGroq(message: string, historial: Mensaje[], contextoExtra: string | null): Promise<string> {
  const systemFinal = contextoExtra
    ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO DRIVE ===\n${contextoExtra}\n=== FIN ===`
    : SYSTEM_PROMPT;

  const messages = [
    { role: "system" as const, content: systemFinal },
    ...historial.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  try {
    const r = await groqClient!.chat.completions.create({ model: MODELO, messages, max_tokens: 800, temperature: 0.6 });
    return r.choices[0]?.message?.content ?? "";
  } catch {
    const r = await groqClient!.chat.completions.create({ model: MODELO_FALLBACK, messages, max_tokens: 800, temperature: 0.6 });
    return r.choices[0]?.message?.content ?? "";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    const projectId: string | undefined = body?.projectId;
    const historial: Mensaje[] = Array.isArray(body?.history) ? body.history : [];

    if (!message.trim()) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

    let aiText = "";
    let modoDemo = false;
    let fuentesRAG: { source: string; text: string }[] = [];
    let contextoExtra: string | null = null;

    if (projectId && debeUsarRAG(message)) {
      try {
        fuentesRAG = await buscarContextoDrive(projectId, message, 3);
        if (fuentesRAG.length > 0) {
          contextoExtra = fuentesRAG.map((f, i) => `[${i + 1}] ${f.source}\n${f.text}`).join("\n\n");
        }
      } catch { /* RAG es best-effort */ }
    }

    if (!groqClient) {
      aiText = respuestaDemo(message);
      modoDemo = true;
    } else {
      try {
        aiText = await llamarGroq(message, historial, contextoExtra);
        if (!aiText.trim()) { aiText = respuestaDemo(message); modoDemo = true; }
      } catch {
        aiText = respuestaDemo(message);
        modoDemo = true;
      }
    }

    if (fuentesRAG.length > 0 && !modoDemo) {
      aiText += `\n\n---\n📎 **Fuentes Drive:** ${fuentesRAG.map((f) => f.source).join(", ")}`;
    }

    if (projectId) {
      try {
        const supabase = await createClient();
        await supabase.from("conversations").insert({
          project_id: projectId,
          user_message: message,
          ai_response: aiText,
          role: modoDemo ? "demo" : "user",
        });
      } catch { /* persistencia best-effort */ }
    }

    return NextResponse.json({ reply: aiText, demo: modoDemo, sources: fuentesRAG.map((f) => f.source) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error desconocido" }, { status: 500 });
  }
}
