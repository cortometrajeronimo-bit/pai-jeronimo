"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, AlertOctagon, AlertTriangle, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Incident } from "@/lib/types";

type BadgeVariant = "default" | "warning" | "danger" | "success" | "accent" | "outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardarIncidente, eliminarIncidente } from "@/app/(dashboard)/incidents/actions";

const META: Record<Incident["type"], { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  menor: { label: "Menor", variant: "default", icon: AlertCircle },
  medio: { label: "Medio", variant: "warning", icon: AlertTriangle },
  grave: { label: "Grave", variant: "danger", icon: AlertOctagon },
};

const VACIO = (projectId: string): Incident => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  type: "menor",
  description: "",
  affected_person: null,
  action_taken: null,
  reporter: null,
  created_at: "",
});

export function IncidentsClient({
  incidents,
  projectId,
}: {
  incidents: Incident[];
  projectId: string;
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [editando, setEditando] = useState<Incident | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(
    () => incidents.filter((i) => !filtroTipo || i.type === filtroTipo),
    [incidents, filtroTipo]
  );

  const conteos = useMemo(() => {
    const c = { menor: 0, medio: 0, grave: 0 };
    for (const i of incidents) c[i.type]++;
    return c;
  }, [incidents]);

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function guardar() {
    if (!editando || !editando.description.trim()) {
      setError("La descripción es obligatoria");
      return;
    }
    startTransition(async () => {
      const r = await guardarIncidente({
        id: editando.id || undefined,
        project_id: projectId,
        date: editando.date,
        type: editando.type,
        description: editando.description,
        affected_person: editando.affected_person,
        action_taken: editando.action_taken,
        reporter: editando.reporter,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este reporte?")) return;
    startTransition(async () => {
      await eliminarIncidente(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Menores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conteos.menor}</div>
          </CardContent>
        </Card>
        <Card className={conteos.medio > 0 ? "border-advertencia" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Medios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-advertencia">{conteos.medio}</div>
          </CardContent>
        </Card>
        <Card className={conteos.grave > 0 ? "border-error" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Graves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{conteos.grave}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="max-w-[180px]"
        >
          <option value="">Todos</option>
          <option value="menor">Menor</option>
          <option value="medio">Medio</option>
          <option value="grave">Grave</option>
        </Select>
        <Button onClick={abrirNuevo} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Nuevo reporte
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            {incidents.length === 0
              ? "Sin incidentes registrados. ¡Que siga así!"
              : "Sin resultados para ese filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((i) => {
            const meta = META[i.type];
            const Icon = meta?.icon || ((props: React.SVGProps<SVGSVGElement>) => <svg {...props} />);
            return (
              <Card
                key={i.id}
                className={
                  i.type === "grave"
                    ? "border-error"
                    : i.type === "medio"
                    ? "border-advertencia"
                    : ""
                }
              >
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`h-5 w-5 mt-0.5 ${
                        i.type === "grave"
                          ? "text-error"
                          : i.type === "medio"
                          ? "text-advertencia"
                          : "text-textoSec"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={meta.variant} className="text-xs">
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-textoSec">{i.date}</span>
                        {i.reporter && (
                          <span className="text-xs text-textoTerc">
                            por {i.reporter}
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{i.description}</p>
                      {i.affected_person && (
                        <p className="text-xs text-textoSec mt-1">
                          Afectado(a): <span className="text-acento">{i.affected_person}</span>
                        </p>
                      )}
                      {i.action_taken && (
                        <p className="text-xs text-textoSec mt-1">
                          Acción: {i.action_taken}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditando(i)}
                        className="text-textoSec hover:text-acento"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(i.id)}
                        className="text-textoSec hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editando && (
        <Dialog open onClose={() => setEditando(null)}>
          <DialogHeader>
            <DialogTitle>{editando.id ? "Editar" : "Nuevo"} reporte</DialogTitle>
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
                <Label>Gravedad</Label>
                <Select
                  value={editando.type}
                  onChange={(e) =>
                    setEditando({ ...editando, type: e.target.value as Incident["type"] })
                  }
                >
                  <option value="menor">Menor</option>
                  <option value="medio">Medio</option>
                  <option value="grave">Grave</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={editando.description}
                onChange={(e) =>
                  setEditando({ ...editando, description: e.target.value })
                }
                placeholder="¿Qué pasó?"
              />
            </div>
            <div>
              <Label>Persona afectada</Label>
              <Input
                value={editando.affected_person ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, affected_person: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label>Acción tomada</Label>
              <Textarea
                rows={2}
                value={editando.action_taken ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, action_taken: e.target.value || null })
                }
              />
            </div>
            <div>
              <Label>Reporta</Label>
              <Input
                value={editando.reporter ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, reporter: e.target.value || null })
                }
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
