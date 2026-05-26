"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { CrewPayment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCOP } from "@/lib/utils";
import { guardarPago, eliminarPago, marcarPagado } from "@/app/(dashboard)/payments/actions";

type CrewLite = { id: string; name: string; role: string };

const VACIO = (projectId: string): CrewPayment => ({
  id: "",
  project_id: projectId,
  crew_member_id: "",
  amount: 0,
  agreed_date: new Date().toISOString().slice(0, 10),
  paid_date: null,
  status: "pendiente",
  method: null,
  notes: null,
  created_at: "",
});

// Auto-marcar atrasados: pendientes con agreed_date < hoy
function recalcEstado(p: CrewPayment): CrewPayment {
  if (p.status === "pendiente" && p.agreed_date) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (p.agreed_date < hoy) {
      return { ...p, status: "atrasado" };
    }
  }
  return p;
}

export function PaymentsClient({
  payments,
  crew,
  projectId,
}: {
  payments: CrewPayment[];
  crew: CrewLite[];
  projectId: string;
}) {
  const [editando, setEditando] = useState<CrewPayment | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Aplicar reclasificación visual de atrasados
  const datos = useMemo(() => payments.map(recalcEstado), [payments]);

  const resumen = useMemo(() => {
    const pagado = datos
      .filter((p) => p.status === "pagado")
      .reduce((a, b) => a + Number(b.amount), 0);
    const pendiente = datos
      .filter((p) => p.status === "pendiente" || p.status === "atrasado")
      .reduce((a, b) => a + Number(b.amount), 0);
    const atrasados = new Set(
      datos.filter((p) => p.status === "atrasado").map((p) => p.crew_member_id)
    );
    return { pagado, pendiente, atrasados: atrasados.size };
  }, [datos]);

  const nombreDe = (id: string) => crew.find((c) => c.id === id)?.name ?? "—";
  const rolDe = (id: string) => crew.find((c) => c.id === id)?.role ?? "";

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function guardar() {
    if (!editando || !editando.crew_member_id || editando.amount <= 0) {
      setError("Selecciona crew y monto válido");
      return;
    }
    startTransition(async () => {
      const r = await guardarPago({
        id: editando.id || undefined,
        project_id: projectId,
        crew_member_id: editando.crew_member_id,
        amount: Number(editando.amount),
        agreed_date: editando.agreed_date,
        paid_date: editando.paid_date,
        status: editando.status,
        method: editando.method,
        notes: editando.notes,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    startTransition(async () => {
      await eliminarPago(id);
    });
  }

  function pagar(id: string) {
    startTransition(async () => {
      await marcarPagado(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-exito">{formatCOP(resumen.pagado)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-acento">
              {formatCOP(resumen.pendiente)}
            </div>
          </CardContent>
        </Card>
        <Card className={resumen.atrasados > 0 ? "border-error" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {resumen.atrasados > 0 && <AlertTriangle className="h-4 w-4 text-error" />}
              Personas con pago atrasado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{resumen.atrasados}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo pago
        </Button>
      </div>

      {datos.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            Sin pagos registrados aún.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-textoSec">
                  <th className="py-2 px-2">Crew</th>
                  <th className="py-2 px-2">Rol</th>
                  <th className="py-2 px-2 text-right">Monto</th>
                  <th className="py-2 px-2">Fecha acordada</th>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Método</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {datos.map((p) => (
                  <tr key={p.id} className="border-b border-borde/50 hover:bg-superficieAlt">
                    <td className="py-2 px-2 font-medium">{nombreDe(p.crew_member_id)}</td>
                    <td className="py-2 px-2 text-textoSec text-xs">{rolDe(p.crew_member_id)}</td>
                    <td className="py-2 px-2 text-right font-semibold">
                      {formatCOP(Number(p.amount))}
                    </td>
                    <td className="py-2 px-2">{p.agreed_date ?? "—"}</td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          p.status === "pagado"
                            ? "success"
                            : p.status === "atrasado"
                            ? "danger"
                            : "warning"
                        }
                        className="text-xs"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-xs text-textoSec">{p.method ?? "—"}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        {p.status !== "pagado" && (
                          <button
                            onClick={() => pagar(p.id)}
                            className="text-textoSec hover:text-exito"
                            title="Marcar pagado"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditando(p)}
                          className="text-textoSec hover:text-acento"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminar(p.id)}
                          className="text-textoSec hover:text-error"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {editando && (
        <Dialog open onClose={() => setEditando(null)}>
          <DialogHeader>
            <DialogTitle>{editando.id ? "Editar" : "Nuevo"} pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Crew member</Label>
              <Select
                value={editando.crew_member_id}
                onChange={(e) =>
                  setEditando({ ...editando, crew_member_id: e.target.value })
                }
              >
                <option value="">Seleccionar...</option>
                {crew.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.role}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monto (COP)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={editando.amount === 0 ? "" : editando.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditando({
                      ...editando,
                      amount: v === "" ? 0 : Number(v),
                    });
                  }}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Select
                  value={editando.status}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      status: e.target.value as CrewPayment["status"],
                    })
                  }
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="pagado">Pagado</option>
                  <option value="atrasado">Atrasado</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha acordada</Label>
                <Input
                  type="date"
                  value={editando.agreed_date ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, agreed_date: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Fecha pagada</Label>
                <Input
                  type="date"
                  value={editando.paid_date ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, paid_date: e.target.value || null })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Método</Label>
              <Input
                value={editando.method ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, method: e.target.value || null })
                }
                placeholder="Transferencia / Efectivo / Nequi..."
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
