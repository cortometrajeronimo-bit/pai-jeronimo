import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP, formatDate } from "@/lib/utils";
import { Calendar, MapPin, Users, Wallet } from "lucide-react";

export default async function ProyectoPage() {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("name", "JERÓNIMO")
    .maybeSingle();

  // Conteos rápidos (con fallback si DB no responde)
  const [{ count: crewCount }, { count: equipCount }, { data: expenses }] = await Promise.all([
    supabase.from("crew_members").select("*", { count: "exact", head: true }),
    supabase.from("equipment").select("*", { count: "exact", head: true }),
    supabase.from("expenses").select("amount, category"),
  ]);

  const ejecutado = (expenses ?? []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const presupuesto = Number(project?.budget_total ?? 9540500);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {project?.name ?? "JERÓNIMO"}
        </h1>
        <p className="text-textoSec mt-1">
          {project?.location ?? "Tuluá, Valle del Cauca, Colombia"} ·{" "}
          {project?.type ?? "Cortometraje"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Rodaje</CardTitle>
            <Calendar className="h-4 w-4 text-acento" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {project?.start_date ? formatDate(project.start_date) : "4 - 10 jun 2026"}
            </div>
            <p className="text-xs text-textoSec mt-1">5 días de rodaje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Crew</CardTitle>
            <Users className="h-4 w-4 text-acento" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crewCount ?? 19}</div>
            <p className="text-xs text-textoSec mt-1">personas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Presupuesto</CardTitle>
            <Wallet className="h-4 w-4 text-acento" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCOP(presupuesto)}</div>
            <p className="text-xs text-textoSec mt-1">
              {formatCOP(ejecutado)} ejecutado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Equipos</CardTitle>
            <MapPin className="h-4 w-4 text-acento" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipCount ?? 0}</div>
            <p className="text-xs text-textoSec mt-1">items de UAO</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Estado actual del corto JERÓNIMO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-textoSec">Estado:</span>{" "}
            <span className="text-acento">{project?.status ?? "pre-producción"}</span>
          </p>
          <p>
            <span className="text-textoSec">Productor general:</span> Manuelita Sánchez Ortiz
          </p>
          <p>
            <span className="text-textoSec">Asistente de producción:</span> Daniel Quintero Bernal · 3186794335
          </p>
          <p>
            <span className="text-textoSec">Director:</span> Luis Alejandro Vargas Lemus
          </p>
        </CardContent>
      </Card>

      {!project && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-advertencia">
              ⚠ Aún no se ha conectado Supabase con datos. Sigue las instrucciones en{" "}
              <code className="bg-superficieAlt px-1 rounded">docs/SETUP.md</code> para
              correr el schema y el seed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
