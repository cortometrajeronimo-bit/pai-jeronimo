"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, AlertTriangle, ExternalLink } from "lucide-react";
import type { Contract } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { guardarContrato, eliminarContrato } from "@/app/(dashboard)/contracts/actions";

const TIPOS: Contract["type"][] = ["locacion", "talento", "equipo", "seguro", "otro"];
const ESTADOS: Contract["status"][] = ["por_firmar", "vigente", "vencido"];

const VACIO = (projectId: string): Contract => ({
  id: "",
  project_id: projectId,
  name: "",
  type: "locacion",
  sign_date: null,
  expiry_date: null,
  status: "por_firmar",
  file_url: null,
  notes: null,
  created_at: "",
});

// Días hasta expiración (negativo = vencido)
function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha + "T00:00:00");
  return Math.ceil((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function ContractsClient({
  contracts,
  projectId,
}: {
  contracts: Contract[];
  projectId: string;
}) {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [editando, setEditando] = useState<Contract | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(
    () =>
      contracts.filter((c) => {
        if (filtroTipo && c.type !== filtroTipo) return false;
        if (filtroEstado && c.status !== filtroEstado) return false;
        return true;
      }),
    [contracts, filtroTipo, filtroEstado]
  );

  const porVencer = useMemo(
    () =>
      contracts.filter((c) => {
        const d = diasHasta(c.expiry_date);
        return d !== null && d >= 0 && d <= 7;
      }),
    [contracts]
  );

  const vencidos = useMemo(
    () => contracts.filter((c) => {
      const d = diasHasta(c.expiry_date);
      return d !== null && d < 0;
    }),
    [contracts]
  );

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function guardar() {
    if (!editando || !editando.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    startTransition(async () => {
      const r = await guardarContrato({
        id: editando.id || undefined,
        project_id: projectId,
        name: editando.name,
        type: editando.type,
        sign_date: editando.sign_date,
        expiry_date: editando.expiry_date,
        status: editando.status,
        file_url: editando.file_url,
        notes: editando.notes,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este contrato?")) return;
    startTransition(async () => {
      await eliminarContrato(id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contracts.length}</div>
          </CardContent>
        </Card>
        <Card className={porVencer.length > 0 ? "border-advertencia" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {porVencer.length > 0 && <AlertTriangle className="h-4 w-4 text-advertencia" />}
              Por vencer (≤7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-advertencia">{porVencer.length}</div>
          </CardContent>
        </Card>
        <Card className={vencidos.length > 0 ? "border-error" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {vencidos.length > 0 && <AlertTriangle className="h-4 w-4 text-error" />}
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{vencidos.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + alta */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="max-w-[180px]"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="max-w-[180px]"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace("_", " ")}
            </option>
          ))}
        </Select>
        <Button onClick={abrirNuevo} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Nuevo contrato
        </Button>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            {contracts.length === 0
              ? "Aún no hay contratos. Registra el primero."
              : "Sin resultados para esos filtros."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtrados.map((c) => {
            const dias = diasHasta(c.expiry_date);
            const alerta = dias !== null && dias < 7;
            const vencido = dias !== null && dias < 0;
            return (
              <Card
                key={c.id}
                className={vencido ? "border-error" : alerta ? "border-advertencia" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {c.type}
                        </Badge>
                        <Badge
                          variant={
                            c.status === "vigente"
                              ? "success"
                              : c.status === "vencido"
                              ? "danger"
                              : "warning"
                          }
                          className="text-xs"
                        >
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditando(c)}
                        className="text-textoSec hover:text-acento"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(c.id)}
                        className="text-textoSec hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {c.sign_date && (
                    <p>
                      <span className="text-textoSec">Firma:</span> {c.sign_date}
                    </p>
                  )}
                  {c.expiry_date && (
                    <p className={vencido ? "text-error" : alerta ? "text-advertencia" : ""}>
                      <span className="text-textoSec">Vence:</span> {c.expiry_date}
                      {dias !== null && (
                        <span className="ml-2 font-semibold">
                          {vencido ? `(vencido hace ${-dias}d)` : `(en ${dias}d)`}
                        </span>
                      )}
                    </p>
                  )}
                  {c.file_url && (
                    <a
                      href={c.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-acento hover:underline text-xs"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver archivo
                    </a>
                  )}
                  {c.notes && <p className="text-xs text-textoSec">{c.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editando && (
        <Dialog open onClose={() => setEditando(null)}>
          <DialogHeader>
            <DialogTitle>{editando.id ? "Editar" : "Nuevo"} contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input
                value={editando.name}
                onChange={(e) => setEditando({ ...editando, name: e.target.value })}
                placeholder="Ej: Locación Casa Tuluá"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editando.type}
                  onChange={(e) =>
                    setEditando({ ...editando, type: e.target.value as Contract["type"] })
                  }
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select
                  value={editando.status}
                  onChange={(e) =>
                    setEditando({ ...editando, status: e.target.value as Contract["status"] })
                  }
                >
                  {ESTADOS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha firma</Label>
                <Input
                  type="date"
                  value={editando.sign_date ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, sign_date: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Fecha vencimiento</Label>
                <Input
                  type="date"
                  value={editando.expiry_date ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, expiry_date: e.target.value || null })
                  }
                />
              </div>
            </div>
            <div>
              <Label>URL del archivo</Label>
              <Input
                value={editando.file_url ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, file_url: e.target.value || null })
                }
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={editando.notes ?? ""}
                onChange={(e) => setEditando({ ...editando, notes: e.target.value || null })}
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
