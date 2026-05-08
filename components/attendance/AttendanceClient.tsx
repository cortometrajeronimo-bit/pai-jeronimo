"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LogOut as LogOutIcon, Clock } from "lucide-react";
import type { Attendance } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  marcarLlegada,
  marcarSalida,
  actualizarEstado,
  eliminarAsistencia,
} from "@/app/(dashboard)/attendance/actions";

type CrewLite = { id: string; name: string; role: string };

const ESTADOS: Attendance["status"][] = ["presente", "ausente", "retardo"];

function hora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceClient({
  crew,
  attendance,
  projectId,
  fecha,
}: {
  crew: CrewLite[];
  attendance: Attendance[];
  projectId: string;
  fecha: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Mapa rápido para lookup por crew_id
  const porCrew = useMemo(() => {
    const m = new Map<string, Attendance>();
    for (const a of attendance) m.set(a.crew_member_id, a);
    return m;
  }, [attendance]);

  const presentes = attendance.filter((a) => a.status === "presente").length;
  const total = crew.length;
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;

  function llegada(crewId: string) {
    startTransition(async () => {
      await marcarLlegada(projectId, crewId);
    });
  }

  function salida(id: string) {
    startTransition(async () => {
      await marcarSalida(id);
    });
  }

  function cambiarEstado(id: string, status: Attendance["status"]) {
    startTransition(async () => {
      await actualizarEstado(id, status);
    });
  }

  function quitar(id: string) {
    if (!confirm("¿Quitar este registro?")) return;
    startTransition(async () => {
      await eliminarAsistencia(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">% Asistencia hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-acento">{pct}%</div>
            <p className="text-xs text-textoSec mt-1">
              {presentes} de {total} crew
            </p>
            <div className="mt-2 h-2 w-full bg-superficieAlt rounded-full overflow-hidden">
              <div
                className="h-full bg-acento transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Presentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-exito">{presentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sin marcar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-textoSec">
              {total - attendance.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selector de fecha */}
      <div className="flex gap-2 items-center">
        <label className="text-sm text-textoSec">Fecha:</label>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => router.push(`/attendance?date=${e.target.value}`)}
          className="max-w-[200px]"
        />
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-borde text-left text-textoSec">
                <th className="py-2 px-2">Nombre</th>
                <th className="py-2 px-2">Rol</th>
                <th className="py-2 px-2">Llegada</th>
                <th className="py-2 px-2">Salida</th>
                <th className="py-2 px-2">Estado</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {crew.map((c) => {
                const a = porCrew.get(c.id);
                return (
                  <tr key={c.id} className="border-b border-borde/50 hover:bg-superficieAlt">
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2 text-xs text-textoSec">{c.role}</td>
                    <td className="py-2 px-2 text-xs">{hora(a?.check_in_time ?? null)}</td>
                    <td className="py-2 px-2 text-xs">{hora(a?.check_out_time ?? null)}</td>
                    <td className="py-2 px-2">
                      {a ? (
                        <Select
                          value={a.status}
                          onChange={(e) =>
                            cambiarEstado(a.id, e.target.value as Attendance["status"])
                          }
                          className="h-7 py-0 text-xs"
                          disabled={pending}
                        >
                          {ESTADOS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          sin marcar
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        {!a && (
                          <button
                            onClick={() => llegada(c.id)}
                            className="text-xs flex items-center gap-1 text-exito hover:underline"
                            disabled={pending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Llegada
                          </button>
                        )}
                        {a && !a.check_out_time && (
                          <button
                            onClick={() => salida(a.id)}
                            className="text-xs flex items-center gap-1 text-acento hover:underline"
                            disabled={pending}
                          >
                            <LogOutIcon className="h-3.5 w-3.5" />
                            Salida
                          </button>
                        )}
                        {a && (
                          <button
                            onClick={() => quitar(a.id)}
                            className="text-xs text-textoSec hover:text-error ml-1"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
