// Helper para Google Calendar API v3 con Service Account (sin OAuth flow).
// Permite crear un calendario público y sincronizar eventos (Call Sheets, Transportes).

import { obtenerAccessToken, driveDisponible } from "@/lib/google-drive";
import { createClient } from "@/lib/supabase/server";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function postApi(url: string, body: unknown): Promise<any> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Calendar POST error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function putApi(url: string, body: unknown): Promise<any> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Calendar PUT error ${r.status}: ${await r.text()}`);
  return r.json();
}

async function deleteApi(url: string): Promise<void> {
  const token = await obtenerAccessToken();
  const r = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok && r.status !== 404) {
    throw new Error(`Calendar DELETE error ${r.status}: ${await r.text()}`);
  }
}

/**
 * Crea un calendario público y devuelve su ID y el enlace para agregarlo.
 */
export async function crearCalendarioCompartido(nombreProyecto: string): Promise<{ calendarId: string; shareLink: string }> {
  if (!driveDisponible()) {
    throw new Error("Credenciales de Google no disponibles.");
  }

  // 1. Crear el calendario secundario
  const resCalendar = await postApi(`${CALENDAR_API}/calendars`, {
    summary: `P.A.I. - ${nombreProyecto}`,
    description: `Calendario de Rodaje para el proyecto ${nombreProyecto}, generado por Productor Asistente Inteligente (P.A.I.)`,
    timeZone: "America/Bogota",
  });

  const calendarId = resCalendar.id;

  // 2. Hacer el calendario público (acceso de lectura para todos)
  await postApi(`${CALENDAR_API}/calendars/${calendarId}/acl`, {
    role: "reader",
    scope: { type: "default" },
  });

  // 3. Crear el link público para suscribirse
  // Este link abre Google Calendar en la web y ofrece añadirlo
  const shareLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calendarId)}`;

  return { calendarId, shareLink };
}

/**
 * Limpia y normaliza un UUID para usarlo como Event ID de Google Calendar.
 * Google requiere que el ID de evento sea alfanumérico entre 5 y 1024 caracteres,
 * en minúsculas y sin caracteres especiales (por eso removemos guiones).
 */
function normalizarEventId(uuid: string): string {
  return uuid.replace(/-/g, "").toLowerCase();
}

/**
 * Sincroniza un transporte a Google Calendar.
 */
export async function sincronizarTransporteACalendar(projectId: string, transport: any): Promise<void> {
  if (!driveDisponible()) return;

  const supabase = await createClient();
  // Obtener el ID del calendario del proyecto
  const { data: proj } = await supabase
    .from("projects")
    .select("google_calendar_id")
    .eq("id", projectId)
    .maybeSingle();

  const calendarId = proj?.google_calendar_id;
  if (!calendarId) return;

  const eventId = normalizarEventId(transport.id);
  const startHour = transport.departure_time || "06:00";
  const endHour = transport.arrival_time || "08:00";
  const dateStr = transport.date || new Date().toISOString().slice(0, 10);

  const startISO = `${dateStr}T${startHour}:00-05:00`;
  const endISO = `${dateStr}T${endHour}:00-05:00`;

  const details = {
    id: eventId,
    summary: `🚐 Transp: ${transport.vehicle_name}`,
    location: transport.route || "Cali / Tuluá",
    description: [
      `Vehículo: ${transport.vehicle_name}`,
      `Conductor: ${transport.driver || "Sin conductor"}`,
      `Ruta: ${transport.route || "Sin ruta especificada"}`,
      `Presupuesto: ${transport.allocated_money ? `$${Number(transport.allocated_money).toLocaleString("es-CO")} COP` : "No asignado"}`,
      `Notas: ${transport.notes || "Ninguna"}`,
    ].join("\n"),
    start: { dateTime: startISO, timeZone: "America/Bogota" },
    end: { dateTime: endISO, timeZone: "America/Bogota" },
  };

  try {
    // Intentamos hacer PUT (actualización). Si no existe (404), Google Calendar da error,
    // en cuyo caso hacemos POST (importación) que permite definir el ID del evento.
    await putApi(`${CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, details);
  } catch (err: any) {
    if (err.message.includes("404")) {
      // Usamos el endpoint de import para poder conservar el eventId basado en el UUID
      await postApi(`${CALENDAR_API}/calendars/${calendarId}/events/import`, details);
    } else {
      console.error("Error sincronizando evento de transporte:", err);
    }
  }
}

/**
 * Elimina un evento de transporte en Google Calendar.
 */
export async function eliminarEventoCalendar(projectId: string, rawId: string): Promise<void> {
  if (!driveDisponible()) return;

  const supabase = await createClient();
  const { data: proj } = await supabase
    .from("projects")
    .select("google_calendar_id")
    .eq("id", projectId)
    .maybeSingle();

  const calendarId = proj?.google_calendar_id;
  if (!calendarId) return;

  const eventId = normalizarEventId(rawId);
  try {
    await deleteApi(`${CALENDAR_API}/calendars/${calendarId}/events/${eventId}`);
  } catch (err) {
    console.error("Error eliminando evento de calendar:", err);
  }
}

/**
 * Sincroniza un llamado de rodaje (Call Sheet) a Google Calendar.
 */
export async function sincronizarCallSheetACalendar(projectId: string, callSheet: any): Promise<void> {
  if (!driveDisponible()) return;

  const supabase = await createClient();
  const { data: proj } = await supabase
    .from("projects")
    .select("google_calendar_id")
    .eq("id", projectId)
    .maybeSingle();

  const calendarId = proj?.google_calendar_id;
  if (!calendarId) return;

  const eventId = normalizarEventId(callSheet.id);
  const startHour = callSheet.call_time || "06:00";
  const dateStr = callSheet.date;

  // Fecha y hora del llamado
  const startISO = `${dateStr}T${startHour}:00-05:00`;
  
  // Duración estándar del llamado: 12 horas
  const [h, m] = startHour.split(":").map(Number);
  const endH = (h + 12) % 24;
  const endHourStr = `${endH.toString().padStart(2, "0")}:${(m || 0).toString().padStart(2, "0")}`;
  const endISO = `${dateStr}T${endHourStr}:00-05:00`;

  const details = {
    id: eventId,
    summary: `🎬 Llamado de Rodaje: JERÓNIMO`,
    location: callSheet.location || "Tuluá, Valle del Cauca, Colombia",
    description: [
      `Llamado oficial para el rodaje de JERÓNIMO.`,
      `Hora de Citación: ${startHour}`,
      `Plan B del clima: ${callSheet.weather_plan_b || "Ninguno"}`,
      `Notas de Seguridad: ${callSheet.safety_notes || "Ninguna"}`,
      `Notas Generales: ${callSheet.notes || "Ninguna"}`
    ].join("\n"),
    start: { dateTime: startISO, timeZone: "America/Bogota" },
    end: { dateTime: endISO, timeZone: "America/Bogota" },
  };

  try {
    await putApi(`${CALENDAR_API}/calendars/${calendarId}/events/${eventId}`, details);
  } catch (err: any) {
    if (err.message.includes("404")) {
      await postApi(`${CALENDAR_API}/calendars/${calendarId}/events/import`, details);
    } else {
      console.error("Error sincronizando evento de Call Sheet:", err);
    }
  }
}
