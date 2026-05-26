// Cron diario 12:00 UTC (07:00 Cali). Busca entradas de bitácora con
// category='urgente' y completed_at IS NULL y fecha <= hoy. Por cada owner del
// proyecto envía un Web Push a sus suscripciones activas y marca last_notified_at
// para no repetir el mismo día. Limpia suscripciones caducadas (410/404).

import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Sub = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type LogPendiente = {
  id: string;
  date: string;
  content: string;
  last_notified_at: string | null;
  project_id: string;
  projects: { created_by: string } | { created_by: string }[] | null;
};

function configurarVapid() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:cortometrajeronimo@gmail.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  return true;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!configurarVapid()) {
    return NextResponse.json(
      { ok: false, error: "VAPID keys missing" },
      { status: 500 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdmin(url, serviceKey, {
    auth: { persistSession: false },
  });

  const hoy = new Date().toISOString().slice(0, 10);
  const haceUnDia = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

  const { data: pendientes, error: errLogs } = await admin
    .from("producer_logs")
    .select(
      "id, date, content, last_notified_at, project_id, projects:project_id(created_by)"
    )
    .eq("category", "urgente")
    .is("completed_at", null)
    .lte("date", hoy);

  if (errLogs) {
    return NextResponse.json({ ok: false, error: errLogs.message }, { status: 500 });
  }

  const lista = (pendientes ?? []) as unknown as LogPendiente[];
  const filtrados = lista.filter((l) => {
    if (!l.last_notified_at) return true;
    return l.last_notified_at < haceUnDia;
  });

  if (filtrados.length === 0) {
    return NextResponse.json({ ok: true, pendientes: 0, enviados: 0 });
  }

  // Agrupa por owner para enviar un único push resumen por persona
  const porOwner = new Map<string, LogPendiente[]>();
  for (const l of filtrados) {
    const proj = Array.isArray(l.projects) ? l.projects[0] : l.projects;
    const ownerId = proj?.created_by;
    if (!ownerId) continue;
    const arr = porOwner.get(ownerId) ?? [];
    arr.push(l);
    porOwner.set(ownerId, arr);
  }

  let enviados = 0;
  let suscripcionesEliminadas = 0;
  const errores: string[] = [];

  for (const [ownerId, logs] of Array.from(porOwner.entries())) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", ownerId);

    if (!subs || subs.length === 0) continue;

    const titulo =
      logs.length === 1
        ? "🚨 Urgencia pendiente"
        : `🚨 ${logs.length} urgencias pendientes`;
    const cuerpo =
      logs.length === 1
        ? logs[0].content.slice(0, 140)
        : logs
            .slice(0, 3)
            .map((l) => `• ${l.content.slice(0, 60)}`)
            .join("\n");

    const payload = JSON.stringify({
      title: titulo,
      body: cuerpo,
      url: "/logbook",
      tag: "urgentes-bitacora",
    });

    for (const sub of subs as Sub[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        enviados++;
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        // 404 / 410: suscripción caducada, borrar
        if (err.statusCode === 404 || err.statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          suscripcionesEliminadas++;
        } else {
          errores.push(`${err.statusCode ?? "?"}: ${err.message ?? "error"}`);
        }
      }
    }

    // Marcar como notificados (independientemente de cuántas subs recibieron)
    await admin
      .from("producer_logs")
      .update({ last_notified_at: new Date().toISOString() })
      .in(
        "id",
        logs.map((l) => l.id)
      );
  }

  return NextResponse.json({
    ok: true,
    pendientes: filtrados.length,
    enviados,
    suscripcionesEliminadas,
    errores: errores.slice(0, 10),
  });
}
