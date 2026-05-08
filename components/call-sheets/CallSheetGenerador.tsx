"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Save, Eye, EyeOff, Plus, Trash2, FileText } from "lucide-react";
import type { CrewMember, CallSheet } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CallSheetPreview } from "./CallSheetPreview";
import { descargarCallSheetPDF } from "./CallSheetPDF";
import { departamentoDeRol, DEPARTAMENTOS } from "@/lib/departamentos";
import { formatDate } from "@/lib/utils";
import {
  guardarCallSheet,
  eliminarCallSheet,
} from "@/app/(dashboard)/call-sheets/actions";

type Props = {
  callSheets: CallSheet[];
  crew: CrewMember[];
  projectId: string;
  proyectoNombre: string;
};

const FORM_VACIO = (projectId: string) => ({
  id: undefined as string | undefined,
  project_id: projectId,
  date: "",
  location: "",
  call_time: "06:00",
  crew_ids: [] as string[],
  safety_notes: "",
  weather_plan_b: "",
});

export function CallSheetGenerador({
  callSheets,
  crew,
  projectId,
  proyectoNombre,
}: Props) {
  const [form, setForm] = useState(FORM_VACIO(projectId));
  const [mostrarPreview, setMostrarPreview] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  const crewSeleccionado = useMemo(
    () => crew.filter((m) => form.crew_ids.includes(m.id)),
    [crew, form.crew_ids]
  );

  const crewPorDepto = useMemo(() => {
    const grupos: Record<string, CrewMember[]> = {};
    for (const m of crew) {
      const d = departamentoDeRol(m.role);
      if (!grupos[d]) grupos[d] = [];
      grupos[d].push(m);
    }
    return grupos;
  }, [crew]);

  const toggleCrew = (id: string) => {
    setForm((f) => ({
      ...f,
      crew_ids: f.crew_ids.includes(id)
        ? f.crew_ids.filter((x) => x !== id)
        : [...f.crew_ids, id],
    }));
  };

  const seleccionarDepto = (depto: string) => {
    const ids = (crewPorDepto[depto] ?? []).map((m) => m.id);
    setForm((f) => {
      const todos = ids.every((i) => f.crew_ids.includes(i));
      return {
        ...f,
        crew_ids: todos
          ? f.crew_ids.filter((i) => !ids.includes(i))
          : Array.from(new Set([...f.crew_ids, ...ids])),
      };
    });
  };

  const cargarSheet = (s: CallSheet) => {
    setForm({
      id: s.id,
      project_id: s.project_id,
      date: s.date ?? "",
      location: s.location ?? "",
      call_time: s.call_time ?? "06:00",
      crew_ids: s.crew_ids ?? [],
      safety_notes: s.safety_notes ?? "",
      weather_plan_b: s.weather_plan_b ?? s.weather_backup ?? "",
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const guardar = () => {
    setError(null);
    if (!form.date) {
      setError("Selecciona una fecha");
      return;
    }
    startTransition(async () => {
      const res = await guardarCallSheet({
        ...(form.id ? { id: form.id } : {}),
        project_id: form.project_id,
        date: form.date,
        location: form.location || null,
        call_time: form.call_time || null,
        crew_ids: form.crew_ids,
        safety_notes: form.safety_notes || null,
        weather_plan_b: form.weather_plan_b || null,
        status: "publicado",
      });
      if (!res.ok) setError(res.error ?? "Error guardando");
      else setForm(FORM_VACIO(projectId));
    });
  };

  const generarPDF = async () => {
    setGenerando(true);
    try {
      await descargarCallSheetPDF({
        proyecto: proyectoNombre,
        date: form.date,
        location: form.location,
        callTime: form.call_time,
        crew: crewSeleccionado,
        safetyNotes: form.safety_notes,
        weatherPlanB: form.weather_plan_b,
      });
    } finally {
      setGenerando(false);
    }
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este call sheet?")) return;
    startTransition(async () => {
      await eliminarCallSheet(id);
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-acento" />
                {form.id ? "Editar call sheet" : "Nuevo call sheet"}
              </CardTitle>
              <CardDescription>
                Completa los campos. La vista previa se actualiza en tiempo real.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarPreview((v) => !v)}
              className="lg:hidden"
            >
              {mostrarPreview ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-textoSec">Fecha *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-textoSec">Hora de llamado</Label>
                <Input
                  type="time"
                  value={form.call_time}
                  onChange={(e) => setForm({ ...form, call_time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-textoSec">Locación</Label>
              <Input
                placeholder="Dirección o nombre del set"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-textoSec">
                Crew · {form.crew_ids.length} seleccionados
              </Label>
              <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-2 border border-borde rounded-md p-3 bg-superficieAlt/30">
                {DEPARTAMENTOS.map((depto) => {
                  const items = crewPorDepto[depto] ?? [];
                  if (items.length === 0) return null;
                  const todosSel = items.every((m) =>
                    form.crew_ids.includes(m.id)
                  );
                  return (
                    <div key={depto}>
                      <button
                        type="button"
                        onClick={() => seleccionarDepto(depto)}
                        className="flex items-center justify-between w-full text-left text-xs font-semibold uppercase tracking-wider text-acento mb-1 hover:opacity-80"
                      >
                        <span>{depto}</span>
                        <span className="text-textoSec normal-case font-normal">
                          {todosSel ? "deseleccionar todo" : "seleccionar todo"}
                        </span>
                      </button>
                      <div className="space-y-1">
                        {items.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-superficieAlt rounded px-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={form.crew_ids.includes(m.id)}
                              onChange={() => toggleCrew(m.id)}
                              className="accent-acento"
                            />
                            <span>{m.name}</span>
                            <span className="text-textoSec text-xs">· {m.role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs text-textoSec">Notas de seguridad</Label>
              <Textarea
                placeholder="Botiquín, EPP, contactos de emergencia, etc."
                value={form.safety_notes}
                onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs text-textoSec">Plan B clima</Label>
              <Textarea
                placeholder="Si llueve: traslado a interior; si extremo: reagendar."
                value={form.weather_plan_b}
                onChange={(e) =>
                  setForm({ ...form, weather_plan_b: e.target.value })
                }
                className="mt-1"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={guardar} disabled={pending} className="gap-2">
                <Save className="h-4 w-4" />
                {pending ? "Guardando…" : form.id ? "Actualizar" : "Guardar"}
              </Button>
              <Button
                variant="outline"
                onClick={generarPDF}
                disabled={generando || !form.date || crewSeleccionado.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {generando ? "Generando…" : "Descargar PDF"}
              </Button>
              {form.id && (
                <Button
                  variant="ghost"
                  onClick={() => setForm(FORM_VACIO(projectId))}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vista previa */}
        {mostrarPreview && (
          <div className="space-y-2">
            <p className="text-xs text-textoSec uppercase tracking-wider">
              Vista previa
            </p>
            <CallSheetPreview
              date={form.date}
              location={form.location}
              callTime={form.call_time}
              crewSeleccionado={crewSeleccionado}
              safetyNotes={form.safety_notes}
              weatherPlanB={form.weather_plan_b}
              proyecto={proyectoNombre}
            />
          </div>
        )}
      </div>

      {/* Lista de call sheets existentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call sheets guardados</CardTitle>
          <CardDescription>
            {callSheets.length} {callSheets.length === 1 ? "registro" : "registros"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callSheets.length === 0 ? (
            <p className="text-sm text-textoSec text-center py-6">
              Aún no hay call sheets. Guarda el primero arriba.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {callSheets.map((s) => (
                <div
                  key={s.id}
                  className="rounded-md border border-borde bg-superficieAlt p-4 space-y-2"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold">{formatDate(s.date)}</p>
                    <Badge variant="accent">{s.status}</Badge>
                  </div>
                  <p className="text-xs text-textoSec">{s.location ?? "Sin locación"}</p>
                  <p className="text-xs text-textoSec">
                    Llamado: {s.call_time ?? "—"} · {s.crew_ids?.length ?? 0} personas
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => cargarSheet(s)}>
                      <Plus className="h-3 w-3 mr-1" /> Cargar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEliminar(s.id)}
                    >
                      <Trash2 className="h-3 w-3 text-error" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
