import { createClient } from "@/lib/supabase/server";
import { ContractsClient } from "@/components/contracts/ContractsClient";

export default async function ContractsPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contratos & Permisos</h1>
        <p className="text-textoSec mt-1">Locaciones · Talento · Equipos · Seguros</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <ContractsClient contracts={contracts ?? []} projectId={projectId} />
      )}
    </div>
  );
}
