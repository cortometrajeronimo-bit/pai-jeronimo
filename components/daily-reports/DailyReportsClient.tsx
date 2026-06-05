"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, FileDown } from "lucide-react";
import type { DailyReport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCOP, formatDate } from "@/lib/utils";
import {
  guardarDailyReport,
  eliminarDailyReport,
} from "@/app/(dashboard)/daily-reports/actions";
import { generarDailyReportPDF } from "./DailyReportPDF";

type CrewLite = { id: string; name: string; role: string };
type CashFlowLite = { date: string; amount: number; type: string };

const VACIO = (projectId: string): DailyReport => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  crew_present: [],
  scenes_completed: "",
  incidents: "",
  expenses_total: 0,
  notes: "",
  created_at: "",
});

export function DailyReportsClient({
  reports,
  crew,
  cashflow,
  projectId,
  projectName,
  projectLocation,
}: {
  reports: DailyReport[];
  crew: CrewLite[];
  cashflow: CashFlowLite[];
  projectId: string;
  projectName: string;
  projectLocation: string;
}) {
  const [editando, setEditando] = useState<DailyReport | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Suma automática del gasto del día desde cash_flow
  const gastoDelDia = useMemo(() => {
    if (!editando) return 0;
    return cashflow
      .filter((c) => c.date === editando.date && c.type === "expense")
      .reduce((acc, c) => acc + Number(c.amount), 0);
  }, [editando, cashflow]);

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function toggleCrew(id: string) {
    if (!editando) return;
    const presentes = new Set(editando.crew_present);
    if (presentes.has(id)) presentes.delete(id);
    else presentes.add(id);
    setEditando({ ...editando, crew_present: Array.from(presentes) });
  }

  function guardar() {
    if (!editando) return;
    startTransition(async () => {
      const res = await guardarDailyReport({
        id: editando.id || undefined,
        project_id: projectId,
        date: editando.date,
        crew_present: editando.crew_present,
        scenes_completed: editando.scenes_completed,
        incidents: editando.incidents,
        expenses_total: gastoDelDia, // calculado en frontend
        notes: editando.notes,
      });
      if (!res.ok) setError(res.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este reporte?")) return;
    startTransition(async () => {
      await eliminarDailyReport(id);
    });
  }

  function descargarPDF(r: DailyReport) {
    const presentes = crew.filter((c) => r.crew_present.includes(c.id));
    const ausentes = crew.filter((c) => !r.crew_present.includes(c.id));
    generarDailyReportPDF({
      report: r,
      proyecto: projectName,
      ubicacion: projectLocation,
      presentes,
      ausentes,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo reporte
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            Aún no hay reportes. Crea el primer Daily Report al final del día.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{formatDate(r.date)}</CardTitle>
                    <p className="text-xs text-textoSec mt-1">
                      {r.crew_present.length} crew presente
                    </p>
                  </div>
                  <Badge variant="accent" className="text-xs">
                    {formatCOP(Number(r.expenses_total))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {r.scenes_completed && (
                  <p>
                    <span className="text-textoSec">Escenas:</span> {r.scenes_completed}
                  </p>
                )}
                {r.incidents && (
                  <p className="text-error text-xs">⚠ {r.incidents}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => descargarPDF(r)}
                    className="text-xs flex items-center gap-1 text-acento hover:underline"
                  >
                    <FileDown className="h-4 w-4" /> PDF
                  </button>
                  <button
                    onClick={() => setEditando(r)}
                    className="text-xs flex items-center gap-1 text-textoSec hover:text-acento"
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                  <button
                    onClick={() => eliminar(r.id)}
                    className="text-xs flex items-center gap-1 text-textoSec hover:text-error ml-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editando && (
        <Dialog open onClose={() => setEditando(null)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editando.id ? "Editar" : "Nuevo"} Daily Report
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={editando.date}
                  onChange={(e) => setEditando({ ...editando, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Gasto del día (auto)</Label>
                <Input value={formatCOP(gastoDelDia)} disabled />
              </div>
            </div>

            <div>
              <Label>Escenas completadas</Label>
              <Input
                value={editando.scenes_completed ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, scenes_completed: e.target.value })
                }
                placeholder="Ej: 3, 5, 7B"
              />
            </div>

            <div>
              <Label>Crew presente ({editando.crew_present.length}/{crew.length})</Label>
              <div className="grid grid-cols-2 gap-1 mt-2 max-h-48 overflow-y-auto rounded border border-borde p-2 bg-superficieAlt">
                {crew.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-superficie rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={editando.crew_present.includes(c.id)}
                      onChange={() => toggleCrew(c.id)}
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Incidentes</Label>
              <Textarea
                rows={2}
                value={editando.incidents ?? ""}
                onChange={(e) => setEditando({ ...editando, incidents: e.target.value })}
                placeholder="Sin incidentes / describir si hubo"
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={editando.notes ?? ""}
                onChange={(e) => setEditando({ ...editando, notes: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
