// Endpoint de backup diario — invocado por Vercel Cron cada noche a las 00:00 Colombia.
// También puede llamarse manualmente desde /drive.
//
// Seguridad: valida CRON_SECRET si está definido en env.
// Si no está definido, acepta cualquier request (uso solo en desarrollo o llamadas manuales).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearBackupDiario } from "@/lib/drive-sync";

export async function GET(req: Request) {
  // Validar secret si está configurado
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Obtener el proyecto JERÓNIMO automáticamente
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("name", "JERÓNIMO")
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Proyecto JERÓNIMO no encontrado" }, { status: 404 });
    }

    const resultado = await crearBackupDiario(project.id);

    return NextResponse.json({
      ...resultado,
      proyecto: project.name,
      ejecutadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 }
    );
  }
}

// También acepta POST para llamadas desde la UI
export { GET as POST };
