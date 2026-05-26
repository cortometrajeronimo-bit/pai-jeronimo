"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  Coffee,
  UtensilsCrossed,
  Soup,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Catering } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardarCatering, eliminarCatering } from "@/app/(dashboard)/catering/actions";

type CrewRestriccion = { id: string; name: string; dietary_restrictions: string | null };

const MEAL_META: Record<Catering["meal_type"], { label: string; icon: LucideIcon }> = {
  desayuno: { label: "Desayuno", icon: Coffee },
  almuerzo: { label: "Almuerzo", icon: UtensilsCrossed },
  cena: { label: "Cena", icon: Soup },
};

const VACIO = (projectId: string): Catering => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  meal_type: "almuerzo",
  menu: null,
  provider: null,
  portions_count: 19,
  notes: null,
  created_at: "",
});

// Detecta si el menú contiene ingredientes que chocan con restricciones del crew
function detectarConflictos(
  menu: string | null,
  conRestriccion: CrewRestriccion[]
): { crew: string; restriccion: string; ingrediente: string }[] {
  if (!menu) return [];
  const menuLower = menu.toLowerCase();
  const conflictos: { crew: string; restriccion: string; ingrediente: string }[] = [];

  for (const c of conRestriccion) {
    if (!c.dietary_restrictions) continue;
    // tokenizar restricciones (por comas, "ni", "no", "y")
    const ingredientes = c.dietary_restrictions
      .toLowerCase()
      .split(/[,;]|\bni\b|\bno\b|\by\b/)
      .map((x) => x.trim())
      .filter((x) => x.length > 2);

    for (const ing of ingredientes) {
      if (menuLower.includes(ing)) {
        conflictos.push({
          crew: c.name,
          restriccion: c.dietary_restrictions,
          ingrediente: ing,
        });
      }
    }
  }
  return conflictos;
}

export function CateringClient({
  meals,
  conRestriccion,
  projectId,
}: {
  meals: Catering[];
  conRestriccion: CrewRestriccion[];
  projectId: string;
}) {
  const [editando, setEditando] = useState<Catering | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filtroFecha, setFiltroFecha] = useState("");

  const porDia = useMemo(() => {
    const map = new Map<string, Catering[]>();
    for (const m of meals) {
      if (filtroFecha && m.date !== filtroFecha) continue;
      if (!map.has(m.date)) map.set(m.date, []);
      map.get(m.date)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [meals, filtroFecha]);

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function guardar() {
    if (!editando) return;
    startTransition(async () => {
      const r = await guardarCatering({
        id: editando.id || undefined,
        project_id: projectId,
        date: editando.date,
        meal_type: editando.meal_type,
        menu: editando.menu,
        provider: editando.provider,
        portions_count: editando.portions_count,
        notes: editando.notes,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta comida?")) return;
    startTransition(async () => {
      await eliminarCatering(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Banner de restricciones generales */}
      {conRestriccion.length > 0 && (
        <Card className="border-advertencia">
          <CardContent className="pt-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-advertencia flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">
                Crew con restricciones alimentarias ({conRestriccion.length})
              </p>
              <ul className="text-xs text-textoSec space-y-0.5">
                {conRestriccion.map((c) => (
                  <li key={c.id}>
                    <span className="text-acento font-medium">{c.name}</span> →{" "}
                    {c.dietary_restrictions}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="max-w-[200px]"
        />
        <Button onClick={abrirNuevo} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Nueva comida
        </Button>
      </div>

      {porDia.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            Sin comidas registradas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {porDia.map(([fecha, comidas]) => (
            <div key={fecha}>
              <h3 className="text-sm font-semibold text-acento mb-2">{fecha}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {comidas.map((c) => {
                  const meta = MEAL_META[c.meal_type];
                  const Icon = meta.icon;
                  const conflictos = detectarConflictos(c.menu, conRestriccion);
                  return (
                    <Card
                      key={c.id}
                      className={conflictos.length > 0 ? "border-error" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <Icon className="h-5 w-5 text-acento mt-0.5" />
                            <div>
                              <CardTitle className="text-base">{meta.label}</CardTitle>
                              {c.provider && (
                                <p className="text-xs text-textoSec mt-0.5">
                                  {c.provider}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {c.portions_count ?? 0} pax
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1">
                        {c.menu && <p className="text-xs">{c.menu}</p>}
                        {conflictos.length > 0 && (
                          <div className="rounded border border-error bg-error/10 p-2 text-xs space-y-1">
                            <p className="font-semibold text-error flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Conflictos detectados
                            </p>
                            {conflictos.map((cf, i) => (
                              <p key={i} className="text-textoSec">
                                <span className="text-acento">{cf.crew}</span> no consume{" "}
                                <span className="text-error">{cf.ingrediente}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-xs text-textoSec">{c.notes}</p>
                        )}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setEditando(c)}
                            className="text-xs text-textoSec hover:text-acento"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => eliminar(c.id)}
                            className="text-xs text-textoSec hover:text-error ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Dialog open onClose={() => setEditando(null)}>
          <DialogHeader>
            <DialogTitle>{editando.id ? "Editar" : "Nueva"} comida</DialogTitle>
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
                <Label>Tipo</Label>
                <Select
                  value={editando.meal_type}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      meal_type: e.target.value as Catering["meal_type"],
                    })
                  }
                >
                  <option value="desayuno">Desayuno</option>
                  <option value="almuerzo">Almuerzo</option>
                  <option value="cena">Cena</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Menú</Label>
              <Textarea
                rows={3}
                value={editando.menu ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, menu: e.target.value || null })
                }
                placeholder="Bandeja paisa, jugo natural, frijoles..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proveedor</Label>
                <Input
                  value={editando.provider ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, provider: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Porciones</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={
                    editando.portions_count === null ||
                    editando.portions_count === 0
                      ? ""
                      : editando.portions_count
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditando({
                      ...editando,
                      portions_count: v === "" ? null : Number(v),
                    });
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={editando.notes ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, notes: e.target.value || null })
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
