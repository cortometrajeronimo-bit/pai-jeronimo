import { createClient } from "@/lib/supabase/server";
import { PaymentsClient } from "@/components/payments/PaymentsClient";

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const projectId = project?.id ?? "";
  const [{ data: payments }, { data: crew }] = await Promise.all([
    supabase
      .from("crew_payments")
      .select("*")
      .order("agreed_date", { ascending: true, nullsFirst: false }),
    supabase.from("crew_members").select("id, name, role").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pagos a Crew</h1>
        <p className="text-textoSec mt-1">
          Honorarios y compensaciones · COP
        </p>
      </div>
      {!projectId ? (
        <p className="text-sm text-advertencia">⚠ No hay proyecto JERÓNIMO en la base.</p>
      ) : (
        <PaymentsClient
          payments={payments ?? []}
          crew={crew ?? []}
          projectId={projectId}
        />
      )}
    </div>
  );
}
