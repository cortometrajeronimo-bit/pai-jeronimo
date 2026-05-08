"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Search, AlertCircle, Briefcase, Users, Building2, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProducerLog } from "@/lib/types";

type BadgeVariant = "default" | "warning" | "danger" | "success" | "accent" | "outline";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardarLog, eliminarLog } from "@/app/(dashboard)/logbook/actions";

type Categoria = ProducerLog["category"];

const CATEGORIAS: { key: Categoria; label: string; color: BadgeVariant; icon: LucideIcon }[] = [
  { key: "general", label: "General", color: "default", icon: FileText },
  { key: "urgente", label: "Urgente", color: "danger", icon: AlertCircle },
  { key: "proveedor", label: "Proveedor", color: "warning", icon: Briefcase },
  { key: "elenco", label: "Elenco", color: "accent", icon: Users },
  { key: "UAO", label: "UAO", color: "success", icon: Building2 },
];

const VACIO = (projectId: string): ProducerLog => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  category: "general",
  content: "",
  created_at: "",
});

export function LogbookClient({
  logs,
  projectId,
}: {
  logs: ProducerLog[];
  projectId: string;
}) {
  const [filtroCat, setFiltroCat] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ProducerLog | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      if (filtroCat && l.category !== filtroCat) return false;
      if (busqueda && !l.content.toLowerCase().includes(busqueda.toLowerCase()))
        return false;
      return true;
    });
  }, [logs, filtroCat, busqueda]);

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function guardar() {
    if (!editando || !editando.content.trim()) {
      setError("El contenido es obligatorio");
      return;
    }
    startTransition(async () => {
      const r = await guardarLog({
        id: editando.id || undefined,
        project_id: projectId,
        date: editando.date,
        category: editando.category,
        content: editando.content,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta entrada?")) return;
    startTransition(async () => {
      await eliminarLog(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textoSec" />
          <Input
            placeholder="Buscar en contenido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
          className="max-w-[200px]"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Select>
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1" /> Nueva entrada
        </Button>
      </div>

      {/* Timeline */}
      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            {logs.length === 0
              ? "Bitácora vacía. Crea la primera entrada."
              : "Sin resultados para esos filtros."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtrados.map((l) => {
            const meta = CATEGORIAS.find((c) => c.key === l.category)!;
            const Icon = meta.icon;
            return (
              <Card key={l.id} className="hover:border-acento transition-colors">
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <Icon className="h-4 w-4 text-acento" />
                      <div className="w-px flex-1 bg-borde mt-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={meta.color} className="text-xs">
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-textoSec">{l.date}</span>
                        <span className="text-xs text-textoTerc">
                          {new Date(l.created_at).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{l.content}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditando(l)}
                        className="text-textoSec hover:text-acento"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => eliminar(l.id)}
                        className="text-textoSec hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
            <DialogTitle>{editando.id ? "Editar" : "Nueva"} entrada</DialogTitle>
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
                <Label>Categoría</Label>
                <Select
                  value={editando.category}
                  onChange={(e) =>
                    setEditando({ ...editando, category: e.target.value as Categoria })
                  }
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label>Contenido</Label>
              <Textarea
                rows={5}
                value={editando.content}
                onChange={(e) => setEditando({ ...editando, content: e.target.value })}
                placeholder="¿Qué pasó? Decisión, recordatorio, observación..."
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
