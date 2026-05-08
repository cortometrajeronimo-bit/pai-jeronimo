import { createClient } from "@/lib/supabase/server";
import { ChatClient } from "@/components/chat/ChatClient";

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  // Carga las últimas 50 conversaciones más recientes (orden ascendente para mostrar)
  const { data: conv } = project?.id
    ? await supabase
        .from("conversations")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const inicialesAsc = (conv ?? []).slice().reverse();
  const projectId = project?.id ?? "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat IA</h1>
        <p className="text-textoSec mt-1">
          Asistente con contexto del proyecto JERÓNIMO · Claude
        </p>
      </div>

      {!projectId ? (
        <p className="text-sm text-advertencia">
          ⚠ No hay proyecto JERÓNIMO en la base. Corre el seed primero.
        </p>
      ) : (
        <ChatClient projectId={projectId} inicialesDB={inicialesAsc} />
      )}
    </div>
  );
}
