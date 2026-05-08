import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCOP, formatDate } from "@/lib/utils";
import { climaTulua } from "@/lib/weather";
import {
  Calendar,
  Users,
  Wallet,
  Camera,
  CloudRain,
  Wind,
  Droplet,
  FileText,
  Activity,
  CheckCircle2,
  Clock as ClockIcon,
  Folder,
} from "lucide-react";
import Link from "next/link";

// Fases del proyecto (configuración fija para JERÓNIMO)
const FASES = [
  { key: "desarrollo", label: "Desarrollo", inicio: "2026-01-01", fin: "2026-03-31" },
  { key: "pre", label: "Pre-producción", inicio: "2026-04-01", fin: "2026-06-03" },
  { key: "produccion", label: "Producción", inicio: "2026-06-04", fin: "2026-06-10" },
  { key: "post", label: "Post-producción", inicio: "2026-06-11", fin: "2026-08-31" },
];

function calcularFaseActual(hoy: Date): string {
  const iso = hoy.toISOString().slice(0, 10);
  for (const f of FASES) {
    if (iso >= f.inicio && iso <= f.fin) return f.key;
  }
  return iso < FASES[0].inicio ? "previo" : "completado";
}

function porcentajeFase(faseKey: string, hoy: Date): number {
  const fase = FASES.find((f) => f.key === faseKey);
  if (!fase) return 0;
  const iso = hoy.toISOString().slice(0, 10);
  if (iso < fase.inicio) return 0;
  if (iso > fase.fin) return 100;
  const inicio = new Date(fase.inicio).getTime();
  const fin = new Date(fase.fin).getTime();
  return Math.round(((hoy.getTime() - inicio) / (fin - inicio)) * 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const hoyIso = new Date().toISOString().slice(0, 10);

  // Datos en paralelo
  const [
    { data: project },
    { count: crewCount },
    { data: crewConfirmados },
    { count: equipCount },
    { data: equipDisponibles },
    { data: expenses },
    { data: ultimoArchivo },
    { data: ultimosGastos },
    { data: ultimosMensajes },
    { data: asistenciaHoy },
    { data: ultimoIncidente },
    clima,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, budget_total, start_date, location")
      .eq("name", "JERÓNIMO")
      .maybeSingle(),
    supabase.from("crew_members").select("*", { count: "exact", head: true }),
    supabase.from("crew_members").select("id").eq("is_confirmed", true),
    supabase.from("equipment").select("*", { count: "exact", head: true }),
    supabase.from("equipment").select("id").eq("status", "disponible"),
    supabase.from("expenses").select("amount"),
    supabase
      .from("drive_files")
      .select("name, last_synced_at")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("concept, amount, date, category")
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("conversations")
      .select("user_message, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("attendance")
      .select("status")
      .eq("date", hoyIso)
      .eq("status", "presente"),
    supabase
      .from("incidents")
      .select("date, type, description")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    climaTulua(),
  ]);

  const hoy = new Date();
  const fechaRodaje = new Date(project?.start_date ?? "2026-06-04");
  const diasRestantes = Math.ceil(
    (fechaRodaje.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );

  const presupuesto = Number(project?.budget_total ?? 9_540_500);
  const ejecutado = (expenses ?? []).reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const pctEjecutado = (ejecutado / presupuesto) * 100;

  const faseKey = calcularFaseActual(hoy);
  const pctFase = porcentajeFase(faseKey, hoy);

  const presentesHoy = asistenciaHoy?.length ?? 0;
  const pctAsistencia = (crewCount ?? 0) > 0
    ? Math.round((presentesHoy / (crewCount ?? 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
        <p className="text-textoSec mt-1">JERÓNIMO · {formatDate(hoy)}</p>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-acento" />
              Días al rodaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-acento">
              {diasRestantes > 0 ? diasRestantes : 0}
            </div>
            <p className="text-xs text-textoSec mt-1">
              {diasRestantes > 0
                ? `Inicio: ${formatDate(fechaRodaje)}`
                : "Rodaje en curso o finalizado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-acento" />
              Presupuesto ejecutado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {pctEjecutado.toFixed(1)}
              <span className="text-base text-textoSec">%</span>
            </div>
            <p className="text-xs text-textoSec mt-1">
              {formatCOP(ejecutado)} / {formatCOP(presupuesto)}
            </p>
            <div className="mt-2 h-2 w-full bg-superficieAlt rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  pctEjecutado > 80 ? "bg-error" : "bg-acento"
                } transition-all`}
                style={{ width: `${Math.min(pctEjecutado, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-acento" />
              Crew confirmado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {crewConfirmados?.length ?? 0}
              <span className="text-base text-textoSec">/{crewCount ?? 0}</span>
            </div>
            <p className="text-xs text-textoSec mt-1">personas confirmadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4 text-acento" />
              Equipos listos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {equipDisponibles?.length ?? 0}
              <span className="text-base text-textoSec">/{equipCount ?? 0}</span>
            </div>
            <p className="text-xs text-textoSec mt-1">items disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Folder className="h-4 w-4 text-acento" />
              Último Drive sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold truncate">
              {ultimoArchivo?.name ?? "—"}
            </div>
            <p className="text-xs text-textoSec mt-1">
              {ultimoArchivo?.last_synced_at
                ? new Date(ultimoArchivo.last_synced_at).toLocaleString("es-CO")
                : "Sin sincronizaciones"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clima + Timeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Clima Tuluá */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-acento" />
              Clima en Tuluá
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clima ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{clima.emoji}</span>
                  <div>
                    <div className="text-3xl font-bold">{clima.tempC.toFixed(1)}°C</div>
                    <div className="text-sm text-textoSec">{clima.descripcion}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded bg-superficieAlt p-2">
                    <div className="text-textoSec">Mín / Máx</div>
                    <div className="font-semibold mt-1">
                      {clima.tempMin.toFixed(0)}° / {clima.tempMax.toFixed(0)}°
                    </div>
                  </div>
                  <div className="rounded bg-superficieAlt p-2">
                    <div className="text-textoSec flex items-center gap-1">
                      <Wind className="h-3 w-3" /> Viento
                    </div>
                    <div className="font-semibold mt-1">{clima.vientoKmh.toFixed(0)} km/h</div>
                  </div>
                  <div className="rounded bg-superficieAlt p-2">
                    <div className="text-textoSec flex items-center gap-1">
                      <Droplet className="h-3 w-3" /> Lluvia
                    </div>
                    <div className="font-semibold mt-1">{clima.precipitacionMm.toFixed(1)} mm</div>
                  </div>
                </div>
                <p className="text-xs text-textoSec">{clima.ciudad}</p>
              </div>
            ) : (
              <p className="text-sm text-textoSec">No se pudo obtener el clima.</p>
            )}
          </CardContent>
        </Card>

        {/* Timeline fases */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-acento" />
              Línea de tiempo del proyecto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FASES.map((f) => {
                const esActiva = f.key === faseKey;
                const completada =
                  hoy.toISOString().slice(0, 10) > f.fin;
                const pct = esActiva ? pctFase : completada ? 100 : 0;
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        {completada ? (
                          <CheckCircle2 className="h-4 w-4 text-exito" />
                        ) : esActiva ? (
                          <ClockIcon className="h-4 w-4 text-acento" />
                        ) : (
                          <ClockIcon className="h-4 w-4 text-textoSec" />
                        )}
                        <span className={esActiva ? "font-semibold text-acento" : ""}>
                          {f.label}
                        </span>
                        {esActiva && (
                          <Badge variant="accent" className="text-xs">
                            En curso
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-textoSec">
                        {f.inicio} → {f.fin}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-superficieAlt rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          completada ? "bg-exito" : "bg-acento"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asistencia + último incidente */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-acento" />
              Asistencia hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-acento">{pctAsistencia}%</span>
              <span className="text-sm text-textoSec">
                {presentesHoy} / {crewCount ?? 0} crew
              </span>
            </div>
            <div className="mt-3 h-2 w-full bg-superficieAlt rounded-full overflow-hidden">
              <div
                className="h-full bg-acento transition-all"
                style={{ width: `${pctAsistencia}%` }}
              />
            </div>
            <Link
              href="/attendance"
              className="text-xs text-acento hover:underline mt-3 inline-block"
            >
              Marcar llegadas →
            </Link>
          </CardContent>
        </Card>

        <Card
          className={
            ultimoIncidente?.type === "grave"
              ? "border-error"
              : ultimoIncidente?.type === "medio"
              ? "border-advertencia"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-acento" />
              Último incidente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimoIncidente ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      ultimoIncidente.type === "grave"
                        ? "danger"
                        : ultimoIncidente.type === "medio"
                        ? "warning"
                        : "default"
                    }
                    className="text-xs"
                  >
                    {ultimoIncidente.type}
                  </Badge>
                  <span className="text-xs text-textoSec">{ultimoIncidente.date}</span>
                </div>
                <p className="text-sm line-clamp-3">{ultimoIncidente.description}</p>
                <Link
                  href="/incidents"
                  className="text-xs text-acento hover:underline inline-block"
                >
                  Ver todos →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-textoSec">
                Sin incidentes registrados. ¡Que siga así!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feed de actividad */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5 text-acento" />
              Últimos gastos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(ultimosGastos ?? []).length === 0 ? (
              <p className="text-sm text-textoSec">Sin gastos registrados.</p>
            ) : (
              <ul className="space-y-2">
                {(ultimosGastos ?? []).map((g, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm border-b border-borde/50 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{g.concept}</p>
                      <p className="text-xs text-textoSec">
                        {g.date} · {g.category}
                      </p>
                    </div>
                    <span className="text-error font-semibold">
                      {formatCOP(Number(g.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/presupuesto"
              className="text-xs text-acento hover:underline mt-3 inline-block"
            >
              Ver todos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-acento" />
              Conversaciones recientes con P.A.I.
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(ultimosMensajes ?? []).length === 0 ? (
              <p className="text-sm text-textoSec">Sin mensajes aún.</p>
            ) : (
              <ul className="space-y-2">
                {(ultimosMensajes ?? []).map((m, i) => (
                  <li
                    key={i}
                    className="text-sm border-b border-borde/50 pb-2 last:border-0"
                  >
                    <p className="line-clamp-2">{m.user_message}</p>
                    <p className="text-xs text-textoSec mt-1">
                      {new Date(m.created_at).toLocaleString("es-CO")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/chat"
              className="text-xs text-acento hover:underline mt-3 inline-block"
            >
              Abrir chat →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
