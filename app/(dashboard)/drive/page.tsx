import { createClient } from "@/lib/supabase/server";
import { DriveClient } from "@/components/drive/DriveClient";
import { driveDisponible } from "@/lib/google-drive";

export default async function DrivePage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: archivos } = await supabase
    .from("drive_files")
    .select("*")
    .order("last_synced_at", { ascending: false });

  const projectId = project?.id ?? "";
  const conectado = driveDisponible();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Google Drive</h1>
        <p className="text-textoSec mt-1">
          Archivos sincronizados del proyecto · {conectado ? "Conectado" : "Modo demo"}
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <DriveClient
          archivos={archivos ?? []}
          projectId={projectId}
          conectado={conectado}
        />
      )}
    </div>
  );
}
