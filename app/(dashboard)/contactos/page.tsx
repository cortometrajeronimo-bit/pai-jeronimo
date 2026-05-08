import { createClient } from "@/lib/supabase/server";
import { ContactosClient } from "@/components/contactos/ContactosClient";

export default async function ContactosPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  const { data: contactos } = await supabase
    .from("contacts")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("name");

  const projectId = project?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contactos</h1>
        <p className="text-textoSec mt-1">
          Proveedores · Locaciones · Instituciones · {contactos?.length ?? 0} registros
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <ContactosClient contactos={contactos ?? []} projectId={projectId} />
      )}
    </div>
  );
}
