// Endpoint de sincronización Drive — invocable manualmente o por cron externo.
// Polling cada 5 min vía cliente (DriveClient). TODO: implementar webhook Drive Watch.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sincronizarDrive } from "@/app/(dashboard)/drive/actions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let projectId: string | undefined = body?.projectId;

    if (!projectId) {
      // Fallback: tomar el proyecto JERÓNIMO por nombre
      const supabase = await createClient();
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("name", "JERÓNIMO")
        .maybeSingle();
      projectId = project?.id;
    }

    if (!projectId) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const r = await sincronizarDrive(projectId);
    return NextResponse.json(r);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
