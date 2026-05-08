// Endpoint de chat con Groq (compatible OpenAI SDK) + fallback demo offline
// Persiste el turno en la tabla `conversations` (best-effort)

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { debeUsarRAG, buscarContextoDrive } from "@/lib/rag";

const SYSTEM_PROMPT = `Eres P.A.I., asistente de producción audiovisual experto.
Trabajas para el cortometraje "JERÓNIMO" (rodaje 4-10 jun 2026 en Tuluá, Colombia, crew de 19 personas, presupuesto $9.540.500 COP).
Tienes acceso a documentos del proyecto en Google Drive (guiones, contratos, hojas de presupuesto, briefs de locación).
Cuando recibas un bloque CONTEXTO con fragmentos de documentos, úsalos como fuente de verdad y cita el archivo entre paréntesis al final de la afirmación basada en él.
Responde SIEMPRE en español, sé conciso y práctico. Sugiere acciones concretas.
Si te piden algo fuera del alcance del proyecto, redirige amablemente.`;

// Modelos Groq disponibles en el free tier
const MODELO = "llama-3.3-70b-versatile";
const MODELO_FALLBACK = "mixtral-8x7b-32768";

type Mensaje = { role: "user" | "assistant"; content: string };

// =====================================================
// Modo demo: respuestas predefinidas según palabras clave
// Activo cuando no hay GROQ_API_KEY o cuando la API falla
// =====================================================
function respuestaDemo(mensaje: string): string {
  const m = mensaje.toLowerCase();

  if (/call ?sheet|llamado|hoja de.*llamado/.test(m)) {
    return `Para un buen call sheet del corto JERÓNIMO te recomiendo:

- **Llamado general**: 06:00 (1 h antes del primer plano), maquillaje y vestuario llegan 30 min antes.
- **Locación**: dirección exacta + punto de encuentro de transporte + parqueadero.
- **Crew agrupado por departamento**: producción, dirección, foto, iluminación, arte, sonido. Cada uno con tel + email.
- **Notas de seguridad**: botiquín, EPP por depto, contacto de emergencia, hospital más cercano (Tuluá).
- **Plan B clima**: si llueve, traslado a interior; si extremo, reagendar 24 h.

Genera el PDF desde la pestaña *Call Sheets*. _(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/presupuesto|gasto|costo|plata|dinero|cop\b/.test(m)) {
    return `Estado del presupuesto JERÓNIMO ($9.540.500 COP):

- Desarrollo: $318.000
- Pre-producción: $412.500
- Producción: $5.910.000  ← el grueso
- Post-producción: $2.900.000

Vigila las categorías de **producción** (transporte + alimentación + locación) y **post** (color + sonido). Si superas 80% en cualquiera, aparece la alerta roja en la pestaña *Presupuesto*. Te sugiero registrar cada gasto el mismo día y marcar estado real (planeado / comprometido / ejecutado). _(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/equipo|c[áa]mara|lente|luz|sonido|micr[óo]fono|red|arri|aputure/.test(m)) {
    return `Equipos UAO confirmados para JERÓNIMO:

- **Foto**: RED Gemini, set de lentes, monitores, trípode, slider.
- **Iluminación**: ARRI 1000W, panel Aputure, banderas, difusores.
- **Sonido**: Sennheiser MKH-416, MixPre-6, lavalieres, boom, audífonos.

Revisa la pestaña *Equipos* para marcar cada item como disponible / en uso / dañado. Antes de salir a Tuluá: checklist completo + foto de cada caja. _(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/crew|equipo humano|personal|gente|productor|director|gaffer/.test(m)) {
    return `Crew JERÓNIMO (19 personas):

- **Producción** (3): Manuelita Sánchez, Daniel Quintero, Daniel Rodríguez.
- **Dirección** (3): Alejandro Vargas, Santiago Laverde, Natalia Mafla (script).
- **Foto** (3): Juan David Patiño (DP), Danna Hurtado, Jhon David (DIT).
- **Iluminación** (2): Camila Paredes, Alejandro Bravo.
- **Arte** (3): Lilá López, Liliana Potes, Michelle Florez.
- **Sonido** (2): Juan Sebastián Meza, Tomás Riaños.
- **Post** (2): Gabriela Lucero, Martín Urrea.
- **Elenco**: Ana, Marco, Bebé.

⚠ Atención: Natalia Mafla NO consume cebolla ni maní (alergia). _(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/locaci[óo]n|tulu[áa]|set|escenario/.test(m)) {
    return `Locación principal: Tuluá, Valle del Cauca. Para cada locación confirma: permisos por escrito, contacto + tel del responsable, parqueadero, baño, punto de comida y hospital más cercano. Registra los datos en la pestaña *Contactos* con tag "locacion". _(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/seguridad|emergencia|riesgo|botiqu[íi]n|eps/.test(m)) {
    return `Protocolo de seguridad JERÓNIMO:

- Botiquín completo en set, revisado por producción cada mañana.
- Lista de contactos de emergencia + EPS de cada miembro (visible en pestaña *Crew*).
- Hospital más cercano a la locación, ruta clara para conductores.
- EPP por departamento (guantes y gafas en iluminación, cascos cerca de grúas).
- Reunión de seguridad de 5 min antes del primer plano cada día.

_(Modo demo — agrega GROQ_API_KEY para respuestas con IA)_`;
  }

  if (/hola|buenos|buenas|qu[ée] tal|saludos|hey/.test(m)) {
    return `¡Hola Daniel! Soy P.A.I. en modo demo (sin Groq API key). Aún así puedo orientarte sobre call sheets, presupuesto, equipos, crew, locaciones y seguridad. ¿Por dónde empezamos? _(Agrega GROQ_API_KEY a .env.local para respuestas con IA real)_`;
  }

  return `Soy P.A.I. en modo demo. Agrega \`GROQ_API_KEY\` en \`.env.local\` para respuestas con IA real. Mientras tanto, puedo ayudarte con consultas sobre:

- Call sheets y planificación de rodaje
- Presupuesto y categorías de gasto
- Equipos disponibles (foto, iluminación, sonido)
- Crew (19 personas, con restricciones y EPS)
- Locaciones, seguridad y plan B clima

¿En qué puedo ayudarte con la producción de JERÓNIMO?`;
}

// =====================================================
// Llamada a Groq (compatible OpenAI SDK)
// =====================================================
async function llamarGroq(
  apiKey: string,
  message: string,
  historial: Mensaje[],
  contextoExtra: string | null
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const systemFinal = contextoExtra
    ? `${SYSTEM_PROMPT}\n\n=== CONTEXTO DESDE GOOGLE DRIVE ===\n${contextoExtra}\n=== FIN CONTEXTO ===`
    : SYSTEM_PROMPT;

  const messages = [
    { role: "system" as const, content: systemFinal },
    ...historial.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Intento principal: Llama 3.3 70B (mejor calidad en español)
  try {
    const r = await client.chat.completions.create({
      model: MODELO,
      messages,
      max_tokens: 1024,
      temperature: 0.6,
    });
    return r.choices[0]?.message?.content ?? "";
  } catch (err) {
    // TODO: distinguir entre 429 (rate limit) y errores fatales para reintento
    console.warn(`[chat] modelo ${MODELO} falló, probando ${MODELO_FALLBACK}:`, err);
    const r = await client.chat.completions.create({
      model: MODELO_FALLBACK,
      messages,
      max_tokens: 1024,
      temperature: 0.6,
    });
    return r.choices[0]?.message?.content ?? "";
  }
}

// =====================================================
// Handler principal
// =====================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message: string = body?.message ?? "";
    const projectId: string | undefined = body?.projectId;
    const historial: Mensaje[] = Array.isArray(body?.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    let aiText = "";
    let modoDemo = false;
    let fuentesRAG: { source: string; text: string }[] = [];

    // RAG: si la pregunta menciona documentos/contratos/etc., buscar en drive_files
    let contextoExtra: string | null = null;
    if (projectId && debeUsarRAG(message)) {
      try {
        fuentesRAG = await buscarContextoDrive(projectId, message, 3);
        if (fuentesRAG.length > 0) {
          contextoExtra = fuentesRAG
            .map((f, i) => `[${i + 1}] ${f.source}\n${f.text}`)
            .join("\n\n");
        }
      } catch (err) {
        console.warn("[chat] RAG falló:", err);
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      // Sin key → modo demo silencioso
      aiText = respuestaDemo(message);
      modoDemo = true;
    } else {
      try {
        aiText = await llamarGroq(apiKey, message, historial, contextoExtra);
        if (!aiText.trim()) {
          // Respuesta vacía de la API → caemos al demo
          aiText = respuestaDemo(message);
          modoDemo = true;
        }
      } catch (err) {
        // Cualquier error de Groq (rate limit, auth, network) → demo
        console.error("[chat] Groq falló, usando modo demo:", err);
        aiText = respuestaDemo(message);
        modoDemo = true;
      }
    }

    // Si hubo fuentes RAG, agregar pie de fuentes
    if (fuentesRAG.length > 0 && !modoDemo) {
      aiText += `\n\n---\n📎 **Fuentes consultadas en Drive:** ${fuentesRAG
        .map((f) => f.source)
        .join(", ")}`;
    }

    // Persistencia best-effort: no fallar si la DB no responde
    if (projectId) {
      try {
        const supabase = await createClient();
        await supabase.from("conversations").insert({
          project_id: projectId,
          user_message: message,
          ai_response: aiText,
          role: modoDemo ? "demo" : "user",
        });
      } catch (err) {
        console.error("[chat] no se pudo guardar la conversación:", err);
      }
    }

    return NextResponse.json({
      reply: aiText,
      demo: modoDemo,
      sources: fuentesRAG.map((f) => f.source),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
