// Receptor de notificaciones push de Google Drive.
// Drive envía POST cuando cambia algo en la carpeta watcheada.
// Respondemos 200 rápido y procesamos en background:
//   1. sincronizarDrive       → refresca listado de archivos
//   2. importarTodoDesdeDrive → trae cambios de la Sheet backup a Supabase
//   3. exportarTodoADrive     → re-exporta para mantener consistencia

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sincronizarDrive } from "@/app/(dashboard)/drive/actions";
import {
  importarTodoDesdeDrive,
  exportarTodoADrive,
} from "@/lib/drive-sync";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const estado = req.headers.get("x-goog-resource-state");
  const channelId = req.headers.get("x-goog-channel-id");

  // "sync" es el handshake inicial — solo confirmamos
  if (estado === "sync") {
    return new NextResponse(null, { status: 200 });
  }

  if (
    estado &&
    ["change", "add", "remove", "update", "trash", "untrash"].includes(estado)
  ) {
    try {
      const supabase = await createClient();
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "JERÓNIMO")
        .maybeSingle();

      if (project?.id) {
        // Background — sin await para responder rápido a Drive
        (async () => {
          try {
            await sincronizarDrive(project.id);
            await importarTodoDesdeDrive(project.id);
            await exportarTodoADrive(project.id);
            revalidatePath("/drive");
            revalidatePath("/proyecto");
            revalidatePath("/crew");
            revalidatePath("/cashflow");
            revalidatePath("/presupuesto");
            revalidatePath("/equipos");
          } catch (e) {
            console.error("[Drive Webhook] Sync error:", e);
          }
        })();
      }

      console.log(`[Drive Webhook] channel=${channelId} state=${estado}`);
    } catch (err) {
      console.error("[Drive Webhook] Error:", err);
    }
  }

  // Siempre 200 a Drive (si no, cancela el canal)
  return new NextResponse(null, { status: 200 });
}
