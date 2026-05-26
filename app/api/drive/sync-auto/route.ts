// Cron de fallback: cada 15 min trae cambios de Drive → Supabase y vuelve a exportar.
// Cubre el caso de que el canal de Watch expire o falle una notificación.
// Vercel agrega Authorization: Bearer <CRON_SECRET> cuando CRON_SECRET está en env.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  importarTodoDesdeDrive,
  exportarTodoADrive,
} from "@/lib/drive-sync";
import { sincronizarDrive } from "@/app/(dashboard)/drive/actions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Verificar secret (Vercel cron lo inyecta automáticamente)
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: projects } = await supabase.from("projects").select("id, name");
  if (!projects?.length) {
    return NextResponse.json({ ok: true, projects: 0 });
  }

  const resultados: Array<{
    project: string;
    sync?: boolean;
    importado?: boolean;
    exportado?: boolean;
    error?: string;
  }> = [];

  for (const p of projects) {
    try {
      await sincronizarDrive(p.id);
      const imp = await importarTodoDesdeDrive(p.id);
      const exp = await exportarTodoADrive(p.id);
      resultados.push({
        project: p.name,
        sync: true,
        importado: imp.ok,
        exportado: exp.ok,
      });
    } catch (e) {
      resultados.push({
        project: p.name,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  // Refrescar rutas afectadas
  revalidatePath("/drive");
  revalidatePath("/proyecto");
  revalidatePath("/crew");
  revalidatePath("/cashflow");
  revalidatePath("/presupuesto");
  revalidatePath("/equipos");

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    proyectos: resultados,
  });
}
