"use client";

import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  AlertCircle,
  Briefcase,
  Users,
  Building2,
  FileText,
  CheckCircle2,
  RotateCcw,
  MessageSquarePlus,
  ChevronDown,
  Bell,
} from "lucide-react";
import { PushOptInButton } from "@/components/notifications/PushOptInButton";
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
import {
  guardarLog,
  eliminarLog,
  agregarActualizacion,
  eliminarActualizacion,
  marcarCompletada,
  reabrir,
} from "@/app/(dashboard)/logbook/actions";

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
  completed_at: null,
  last_notified_at: null,
  producer_log_updates: [],
});

function formatHora(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mostrarCompletadas, setMostrarCompletadas] = useState(false);
  const [mostrarNotif, setMostrarNotif] = useState(false);

  const filtrados = useMemo(() => {
    return logs.filter((l) => {
      if (filtroCat && l.category !== filtroCat) return false;
      if (!mostrarCompletadas && l.completed_at) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const enContent = l.content.toLowerCase().includes(q);
        const enUpdates = (l.producer_log_updates ?? []).some((u) =>
          u.note.toLowerCase().includes(q)
        );
        if (!enContent && !enUpdates) return false;
      }
      return true;
    });
  }, [logs, filtroCat, busqueda, mostrarCompletadas]);

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
        completed_at: editando.completed_at,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta entrada y todas sus actualizaciones?")) return;
    startTransition(async () => {
      await eliminarLog(id);
    });
  }

  function toggleCompletada(l: ProducerLog) {
    startTransition(async () => {
      if (l.completed_at) await reabrir(l.id);
      else await marcarCompletada(l.id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Recordatorio diario */}
      <div className="rounded-md border border-borde bg-superficie overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarNotif((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-textoSec hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-acento" />
            Recordatorio diario de urgencias
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${mostrarNotif ? "rotate-180" : ""}`} />
        </button>
        {mostrarNotif && (
          <div className="px-4 pb-4 border-t border-borde space-y-2">
            <p className="text-xs text-textoSec mt-3">
              Activa las notificaciones push para recibir un resumen a las <strong className="text-white">7:00 a.m. (hora Colombia)</strong> cuando haya urgencias abiertas sin cerrar.
            </p>
            <PushOptInButton />
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textoSec" />
          <Input
            placeholder="Buscar en contenido y actualizaciones..."
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
        <label className="flex items-center gap-2 text-xs text-textoSec cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mostrarCompletadas}
            onChange={(e) => setMostrarCompletadas(e.target.checked)}
            className="accent-acento"
          />
          Mostrar completadas
        </label>
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
        <div className="space-y-3">
          {filtrados.map((l) => {
            const meta = CATEGORIAS.find((c) => c.key === l.category)!;
            const Icon = meta?.icon || (typeof AlertTriangle !== "undefined" ? AlertTriangle : "svg");
            const updates = (l.producer_log_updates ?? []).slice().sort((a, b) =>
              a.created_at.localeCompare(b.created_at)
            );
            const isOpen = expandido[l.id] ?? false;
            const completada = !!l.completed_at;

            return (
              <Card
                key={l.id}
                className={`hover:border-acento transition-colors ${
                  completada ? "opacity-60" : ""
                }`}
              >
                <CardContent className="py-4 md:py-5">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center pt-1">
                      <Icon className="h-5 w-5 text-acento shrink-0" />
                      <div className="w-px flex-1 bg-borde mt-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={meta.color} className="text-xs">
                          {meta.label}
                        </Badge>
                        <span className="text-sm text-textoSec font-medium">{l.date}</span>
                        <span className="text-xs text-textoTerc">
                          {new Date(l.created_at).toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {completada && (
                          <Badge variant="success" className="text-xs">
                            ✅ Completada {formatHora(l.completed_at!)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{l.content}</p>

                      {/* Hilo de actualizaciones */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandido((p) => ({ ...p, [l.id]: !p[l.id] }))
                        }
                        className="mt-3 inline-flex items-center gap-1 text-sm text-acento hover:underline"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                        Actualizaciones ({updates.length})
                      </button>

                      {isOpen && (
                        <HiloActualizaciones
                          logId={l.id}
                          updates={updates}
                          pending={pending}
                          startTransition={startTransition}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <button
                        onClick={() => toggleCompletada(l)}
                        className={`p-2 rounded-md hover:bg-superficieAlt transition-colors ${
                          completada ? "text-textoSec" : "text-exito"
                        }`}
                        title={completada ? "Reabrir" : "Marcar terminada"}
                      >
                        {completada ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setEditando(l)}
                        className="p-2 rounded-md hover:bg-superficieAlt text-textoSec hover:text-acento transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(l.id)}
                        className="p-2 rounded-md hover:bg-superficieAlt text-textoSec hover:text-error transition-colors"
                        title="Eliminar"
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
              {editando.id && (
                <p className="text-[11px] text-textoSec mt-1">
                  Para añadir seguimiento sin sobrescribir el original, cierra
                  este diálogo y usa &quot;Actualizaciones&quot; en la card.
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!editando.completed_at}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    completed_at: e.target.checked ? new Date().toISOString() : null,
                  })
                }
                className="accent-acento w-4 h-4"
              />
              <CheckCircle2 className="h-4 w-4 text-exito" />
              Marcar como terminada
            </label>
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

function HiloActualizaciones({
  logId,
  updates,
  pending,
  startTransition,
}: {
  logId: string;
  updates: NonNullable<ProducerLog["producer_log_updates"]>;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  const [nueva, setNueva] = useState("");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llega una nueva nota
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [updates.length]);

  function enviar() {
    const texto = nueva.trim();
    if (!texto) {
      setErrorLocal("Escribe una nota");
      return;
    }
    setErrorLocal(null);
    startTransition(async () => {
      const r = await agregarActualizacion(logId, texto);
      if (!r.ok) setErrorLocal(r.error ?? "Error");
      else setNueva("");
    });
  }

  function quitar(updateId: string) {
    if (!confirm("¿Eliminar esta nota?")) return;
    startTransition(async () => {
      await eliminarActualizacion(updateId);
    });
  }

  return (
    <div className="mt-3 rounded-md border border-borde bg-superficieAlt/40 p-3 space-y-2">
      <div
        ref={listRef}
        className="max-h-[40vh] overflow-y-auto space-y-2 pr-1"
      >
        {updates.length === 0 ? (
          <p className="text-sm text-textoSec italic px-1 py-2">
            Aún no hay actualizaciones. Añade la primera abajo.
          </p>
        ) : (
          updates.map((u) => (
            <div
              key={u.id}
              className="rounded bg-superficie/60 px-3 py-2 flex items-start gap-2 group"
            >
              <span className="text-xs text-textoTerc shrink-0 pt-0.5">
                {formatHora(u.created_at)}
              </span>
              <p className="flex-1 whitespace-pre-wrap text-sm text-textoPri leading-relaxed">{u.note}</p>
              <button
                onClick={() => quitar(u.id)}
                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-textoSec hover:text-error transition-opacity shrink-0"
                title="Eliminar nota"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          rows={3}
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Añadir nota de seguimiento..."
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviar();
          }}
        />
        <Button
          size="sm"
          onClick={enviar}
          disabled={pending}
          className="self-stretch"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
      {errorLocal && <p className="text-sm text-error">{errorLocal}</p>}
      <p className="text-xs text-textoTerc">
        Ctrl/Cmd + Enter para enviar. La fecha se pone automática.
      </p>
    </div>
  );
}
