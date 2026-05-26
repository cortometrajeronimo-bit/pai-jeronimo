// Registra (o renueva) un canal de notificaciones push en Google Drive.
// Invocado: manualmente vía POST, y automáticamente vía cron semanal (lunes 6am UTC).
// El watch expira en 7 días máx → cron lo renueva cada semana.

import { NextResponse } from "next/server";
import { obtenerAccessToken } from "@/lib/google-drive";

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
const WEBHOOK_URL = "https://pai-jeronimo.vercel.app/api/drive/webhook";
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // Autenticación del cron
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return registerWatch();
}

export async function POST() {
  return registerWatch();
}

async function registerWatch() {
  try {
    if (!DRIVE_FOLDER_ID) {
      return NextResponse.json({ error: "GOOGLE_DRIVE_ROOT_FOLDER_ID no configurado" }, { status: 500 });
    }

    const token = await obtenerAccessToken();
    const channelId = `pai-jeronimo-${Date.now()}`;
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 días

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${DRIVE_FOLDER_ID}/watch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: channelId,
          type: "web_hook",
          address: WEBHOOK_URL,
          expiration: expiration.toString(),
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Drive Watch] Error registrando:", err);
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    console.log("[Drive Watch] Canal registrado:", data.id, "expira:", new Date(Number(data.expiration)));
    return NextResponse.json({
      ok: true,
      channelId: data.id,
      expiration: new Date(Number(data.expiration)).toISOString(),
    });
  } catch (err) {
    console.error("[Drive Watch] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
