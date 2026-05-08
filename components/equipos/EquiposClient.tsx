"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Camera, Lightbulb, Mic, Box } from "lucide-react";
import type { Equipment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  guardarEquipo,
  eliminarEquipo,
  actualizarEstadoEquipo,
} from "@/app/(dashboard)/equipos/actions";

const CATEGORIAS = [
  { key: "foto", label: "Fotografía", icon: Camera },
  { key: "ilum", label: "Iluminación", icon: Lightbulb },
  { key: "sonido", label: "Sonido", icon: Mic },
  { key: "otro", label: "Otros", icon: Box },
];

const ESTADOS = [
  { key: "disponible", label: "Disponible", variant: "success" as const },
  { key: "en_uso", label: "En uso", variant: "accent" as const },
  { key: "danado", label: "Dañado", variant: "danger" as const },
  { key: "solicitado", label: "Solicitado", variant: "warning" as const },
];

const VACIO = (projectId: string): Equipment => ({
  id: "",
  project_id: projectId,
  name: "",
  category: "foto",
  units: 1,
  brand: null,
  model: null,
  provider: "UAO",
  status: "disponible",
  notes: null,
});

export function EquiposClient({
  equipos,
  projectId,
}: {
  equipos: Equipment[];
  projectId: string;
}) {
  const [editando, setEditando] = useState<Equipment | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const g: Record<string, Equipment[]> = {};
    for (const e of equipos) {
      const k = CATEGORIAS.find((c) => c.key === e.category) ? e.category : "otro";
      if (!g[k]) g[k] = [];
      g[k].push(e);
    }
    return g;
  }, [equipos]);

  const onGuardar = (e: Equipment) => {
    setError(null);
    startTransition(async () => {
      const { id, ...rest } = e;
      const res = await guardarEquipo({
        ...(id ? { id } : {}),
        ...rest,
        units: Number(rest.units) || 1,
      });
      if (!res.ok) setError(res.error ?? "Error guardando");
      else setEditando(null);
    });
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este equipo?")) return;
    startTransition(async () => {
      await eliminarEquipo(id);
    });
  };

  const onCambiarEstado = (id: string, status: string) => {
    startTransition(async () => {
      await actualizarEstadoEquipo(id, status);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setError(null);
            setEditando(VACIO(projectId));
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Agregar equipo
        </Button>
      </div>

      {CATEGORIAS.map(({ key, label, icon: Icon }) => {
        const items = grupos[key] ?? [];
        if (items.length === 0) return null;
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-4 w-4 text-acento" />
                {label}{" "}
                <span className="text-textoSec text-xs font-normal">
                  · {items.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => {
                  const estadoCfg =
                    ESTADOS.find((s) => s.key === e.status) ?? ESTADOS[0];
                  return (
                    <div
                      key={e.id}
                      className="rounded-md border border-borde bg-superficieAlt p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.name}</p>
                          <p className="text-xs text-textoSec truncate">
                            {[e.brand, e.model].filter(Boolean).join(" · ") || e.provider || "—"}
                          </p>
                        </div>
                        <Badge variant={estadoCfg.variant}>×{e.units}</Badge>
                      </div>
                      <Select
                        value={e.status}
                        onChange={(ev) => onCambiarEstado(e.id, ev.target.value)}
                        disabled={pending}
                        className="h-8 text-xs"
                      >
                        {ESTADOS.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                      {e.notes && (
                        <p className="text-xs text-textoSec line-clamp-2">
                          {e.notes}
                        </p>
                      )}
                      <div className="flex justify-end gap-1 pt-2 border-t border-borde">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditando(e)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEliminar(e.id)}
                        >
                          <Trash2 className="h-3 w-3 text-error" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {equipos.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-textoSec">
            Sin equipos cargados. Agrega el primero.
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!editando}
        onClose={() => {
          setEditando(null);
          setError(null);
        }}
      >
        {editando && (
          <EquipoForm
            inicial={editando}
            onCambio={setEditando}
            onGuardar={onGuardar}
            onCancelar={() => setEditando(null)}
            pending={pending}
            error={error}
          />
        )}
      </Dialog>
    </div>
  );
}

function EquipoForm({
  inicial,
  onCambio,
  onGuardar,
  onCancelar,
  pending,
  error,
}: {
  inicial: Equipment;
  onCambio: (e: Equipment) => void;
  onGuardar: (e: Equipment) => void;
  onCancelar: () => void;
  pending: boolean;
  error: string | null;
}) {
  const set = (k: keyof Equipment, v: unknown) =>
    onCambio({ ...inicial, [k]: v });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{inicial.id ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          onGuardar(inicial);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Nombre *</Label>
          <Input
            required
            value={inicial.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Categoría *</Label>
          <Select
            value={inicial.category}
            onChange={(e) => set("category", e.target.value)}
            className="mt-1"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-textoSec">Unidades</Label>
          <Input
            type="number"
            min={1}
            value={inicial.units}
            onChange={(e) => set("units", Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Marca</Label>
          <Input
            value={inicial.brand ?? ""}
            onChange={(e) => set("brand", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Modelo</Label>
          <Input
            value={inicial.model ?? ""}
            onChange={(e) => set("model", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Proveedor</Label>
          <Input
            value={inicial.provider ?? ""}
            onChange={(e) => set("provider", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Estado</Label>
          <Select
            value={inicial.status}
            onChange={(e) => set("status", e.target.value)}
            className="mt-1"
          >
            {ESTADOS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Notas</Label>
          <Textarea
            value={inicial.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            className="mt-1"
          />
        </div>

        {error && <p className="md:col-span-2 text-sm text-error">{error}</p>}

        <DialogFooter className="md:col-span-2">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
