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
  Apple,
  Minus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Catering } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardarCatering, eliminarCatering } from "@/app/(dashboard)/comida/actions";

type CrewRestriccion = { id: string; name: string; dietary_restrictions: string | null };

const MEAL_META: Record<Catering["meal_type"], { label: string; icon: LucideIcon }> = {
  desayuno: { label: "Desayuno", icon: Coffee },
  refrigerio_1: { label: "Refrigerio AM", icon: Apple },
  almuerzo: { label: "Almuerzo", icon: UtensilsCrossed },
  refrigerio_2: { label: "Refrigerio PM", icon: Apple },
  cena: { label: "Cena", icon: Soup },
};

const VACIO = (projectId: string): Catering => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  meal_type: "almuerzo",
  menu: null,
  provider: null,
  portions_count: 23,
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

export function CateringView({
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

  function ajustarPorciones(c: Catering, delta: number) {
    const newVal = Math.max(0, (c.portions_count ?? 0) + delta);
    startTransition(async () => {
      await guardarCatering({
        id: c.id,
        project_id: projectId,
        date: c.date,
        meal_type: c.meal_type,
        portions_count: newVal,
      });
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

      <div className="flex flex-wrap items-center gap-2 border-b-2 border-borde pb-4 mb-6">
        <Input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="max-w-[200px] border-2 border-borde rounded-none uppercase font-mono tracking-widest text-sm"
        />
        <Button 
          onClick={abrirNuevo} 
          className="ml-auto rounded-none uppercase font-black tracking-widest border-2 border-transparent bg-acento text-black hover:bg-acentoHover"
        >
          <Plus className="h-5 w-5 mr-2" strokeWidth={3} /> CREAR MENÚ
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
                  const meta = MEAL_META[c.meal_type] || { label: c.meal_type || "Desconocido", icon: UtensilsCrossed };
                  const Icon = meta?.icon || ((props: React.SVGProps<SVGSVGElement>) => <svg {...props} />);
                  const conflictos = detectarConflictos(c.menu, conRestriccion);
                  return (
                    <Card
                      key={c.id}
                      className={`rounded-none border-2 shadow-none transition-colors ${
                        conflictos.length > 0 ? "border-error" : "border-borde hover:border-textoSec"
                      }`}
                    >
                      <CardHeader className="pb-2 border-b border-borde bg-superficie/30">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Icon className="h-6 w-6 text-acento mt-0.5" strokeWidth={1.5} />
                            <div>
                              <CardTitle className="text-lg font-black uppercase tracking-wider">{meta.label}</CardTitle>
                              {c.provider && (
                                <p className="text-xs text-textoSec mt-0.5 font-mono uppercase">
                                  {c.provider}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 border-2 border-borde p-0.5 bg-fondo">
                            <button
                              onClick={() => ajustarPorciones(c, -1)}
                              disabled={pending}
                              className="p-1 text-textoSec hover:text-acento hover:bg-superficie transition-colors disabled:opacity-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-mono font-bold text-sm min-w-[3ch] text-center">
                              {c.portions_count ?? 0}
                            </span>
                            <button
                              onClick={() => ajustarPorciones(c, 1)}
                              disabled={pending}
                              className="p-1 text-textoSec hover:text-acento hover:bg-superficie transition-colors disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-3 pt-3">
                        {c.menu && <p className="text-sm font-medium leading-relaxed">{c.menu}</p>}
                        {conflictos.length > 0 && (
                          <div className="rounded-none border-l-4 border-l-error border-y border-r border-error/20 bg-error/5 p-3 text-xs space-y-2">
                            <p className="font-black text-error flex items-center gap-2 uppercase tracking-wide">
                              <AlertTriangle className="h-4 w-4" strokeWidth={2.5} />
                              CONFLICTOS DE RESTRICCIÓN
                            </p>
                            {conflictos.map((cf, i) => (
                              <p key={i} className="text-textoSec font-mono">
                                <span className="text-acento">{cf.crew}</span> no consume{" "}
                                <span className="text-error font-bold">{cf.ingrediente}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-xs text-textoSec font-mono border-t border-borde/50 pt-2">
                            NOTA: {c.notes}
                          </p>
                        )}
                        <div className="flex gap-2 pt-3 border-t border-borde">
                          <Button
                            variant="ghost"
                            onClick={() => setEditando(c)}
                            className="flex-1 h-8 rounded-none text-xs font-bold uppercase tracking-wider text-textoSec hover:text-acento hover:bg-superficie"
                          >
                            <Pencil className="h-3 w-3 mr-2" /> Modificar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => eliminar(c.id)}
                            className="h-8 w-8 p-0 rounded-none text-textoSec hover:text-error hover:bg-error/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  <option value="refrigerio_1">Refrigerio AM</option>
                  <option value="almuerzo">Almuerzo</option>
                  <option value="refrigerio_2">Refrigerio PM</option>
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
