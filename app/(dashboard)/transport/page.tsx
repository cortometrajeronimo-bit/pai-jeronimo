import { createClient } from "@/lib/supabase/server";
import { TransportClient } from "@/components/transport/TransportClient";

export const dynamic = "force-dynamic";

export default async function TransportPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";
  const [{ data: vehicles }, { data: crew }] = await Promise.all([
    supabase.from("transport").select("*").order("departure_time"),
    supabase.from("crew_members").select("id, name, role").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transporte</h1>
        <p className="text-textoSec mt-1">Vehículos y asignación de crew</p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <TransportClient
          vehicles={vehicles ?? []}
          crew={crew ?? []}
          projectId={projectId}
        />
      )}
    </div>
  );
}
