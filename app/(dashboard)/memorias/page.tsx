import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TIPO_LABELS: Record<string, string> = {
  preferencia: "Preferencia",
  hecho: "Hecho",
  decision: "Decisión",
};

export default async function MemoriasPage() {
  const supabase = await createClient();
  const { data: memorias } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Memorias</h1>
        <p className="text-textoSec mt-1">
          Hechos y preferencias que P.A.I. recuerda entre sesiones
        </p>
      </div>

      {!memorias || memorias.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-textoSec">
            Aún no hay memorias guardadas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memorias.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-acento">
                  {TIPO_LABELS[m.type] ?? m.type}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{m.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
