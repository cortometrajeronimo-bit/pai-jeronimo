import { createClient } from "@/lib/supabase/server";
import { ContractsClient } from "@/components/contracts/ContractsClient";

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";

  const [{ data: contracts }, { data: templates }, { data: crew }, { data: driveFiles }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*")
      .order("expiry_date", { ascending: true, nullsFirst: false }),
    // Trae plantillas del proyecto + plantillas globales del sistema (project_id null = legales CO)
    supabase
      .from("contract_templates")
      .select("*")
      .order("is_legal_co", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("crew_members").select("id, name, role").order("name"),
    supabase
      .from("drive_files")
      .select("id, drive_file_id, name, web_view_link")
      .order("name", { ascending: true })
      .limit(200),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contratos & Permisos</h1>
        <p className="text-textoSec mt-1">
          Locaciones · Talento · Equipos · Seguros · Plantillas legales CO
        </p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <ContractsClient
          contracts={contracts ?? []}
          templates={templates ?? []}
          crew={crew ?? []}
          driveFiles={driveFiles ?? []}
          project={project!}
          projectId={projectId}
        />
      )}
    </div>
  );
}
