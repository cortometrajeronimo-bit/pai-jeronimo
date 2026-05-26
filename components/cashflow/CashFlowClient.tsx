"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { CashFlow, Expense } from "@/lib/types";
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
import { formatCOP } from "@/lib/utils";
import { toCSV, descargarCSV } from "@/lib/csv";
import {
  guardarCashFlow,
  eliminarCashFlow,
  materializarProyeccion,
} from "@/app/(dashboard)/cashflow/actions";

type Vista = "diaria" | "semanal" | "mensual" | "proyecciones";

const CATEGORIAS = [
  "financiacion",
  "desarrollo",
  "pre-produccion",
  "produccion",
  "post-produccion",
  "transporte",
  "alimentacion",
  "locacion",
  "honorarios",
  "otros",
];

const VACIO = (projectId: string): CashFlow => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  concept: "",
  type: "expense",
  amount: 0,
  category: "produccion",
  is_projected: false,
  notes: null,
  created_at: "",
});

// Acumular saldo cronológicamente — fórmula tipo Excel
function calcularSaldo(movs: CashFlow[]): { saldo: number; movimiento: CashFlow }[] {
  const ordenados = [...movs].sort((a, b) => a.date.localeCompare(b.date));
  let acum = 0;
  return ordenados.map((m) => {
    acum += m.type === "income" ? Number(m.amount) : -Number(m.amount);
    return { saldo: acum, movimiento: m };
  });
}

// Agrupar por semana ISO (lunes-domingo)
function semanaISO(fecha: string): string {
  const d = new Date(fecha + "T00:00:00");
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

export function CashFlowClient({
  movimientos,
  projectId,
  presupuesto,
  presupuestoDisponible: presupuestoDisponibleProp,
  expenses,
}: {
  movimientos: CashFlow[];
  projectId: string;
  presupuesto: number;
  presupuestoDisponible?: number;
  expenses?: Pick<Expense, "concept" | "amount">[];
}) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("diaria");
  const [editando, setEditando] = useState<CashFlow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Estado para alerta de duplicado cruzado con Presupuesto
  const [dupPresupuesto, setDupPresupuesto] = useState<{ concept: string; amount: number } | null>(null);

  const reales = useMemo(() => movimientos.filter((m) => !m.is_projected), [movimientos]);
  const proyectados = useMemo(
    () => movimientos.filter((m) => m.is_projected),
    [movimientos]
  );

  // Saldo real acumulado (usado en vistas diaria y mensual)
  const saldoReal = useMemo(() => calcularSaldo(reales), [reales]);

  // Saldo proyectado: real + proyectados a futuro
  const saldoProyectado = useMemo(
    () => calcularSaldo([...reales, ...proyectados]),
    [reales, proyectados]
  );

  // Métricas Excel-like
  const metricas = useMemo(() => {
    const egresosReales = reales.filter((m) => m.type === "expense");
    const ingresosReales = reales.filter((m) => m.type === "income");
    const totalEgresos = egresosReales.reduce((a, b) => a + Number(b.amount), 0);
    const totalIngresos = ingresosReales.reduce((a, b) => a + Number(b.amount), 0);

    // Presupuesto disponible: se usa el valor oficial del server (desde expenses)
    // si no se recibe, fallback a presupuesto total - egresos en caja
    const disponible =
      presupuestoDisponibleProp !== undefined
        ? presupuestoDisponibleProp
        : presupuesto - totalEgresos;

    // Promedio diario de gasto (días con movimiento)
    const diasUnicos = new Set(egresosReales.map((m) => m.date)).size;
    const promedioDiario = diasUnicos > 0 ? totalEgresos / diasUnicos : 0;

    // Runway basado en presupuesto disponible (siempre positivo si hay presupuesto)
    const runway = promedioDiario > 0 ? Math.floor(disponible / promedioDiario) : Infinity;

    // Variación día a día (último día vs anterior)
    const porDia = new Map<string, number>();
    for (const m of egresosReales) {
      porDia.set(m.date, (porDia.get(m.date) || 0) + Number(m.amount));
    }
    const dias = Array.from(porDia.keys()).sort();
    let variacion = 0;
    if (dias.length >= 2) {
      const ultimo = porDia.get(dias[dias.length - 1])!;
      const previo = porDia.get(dias[dias.length - 2])!;
      variacion = previo > 0 ? ((ultimo - previo) / previo) * 100 : 0;
    }

    const umbralAlerta = presupuesto * 0.1;
    const enAlerta = disponible < umbralAlerta && totalEgresos > 0;

    return {
      totalEgresos,
      totalIngresos,
      disponible,
      promedioDiario,
      runway,
      variacion,
      enAlerta,
      umbralAlerta,
    };
  }, [reales, presupuesto, presupuestoDisponibleProp]);

  function abrirNuevo(tipo: "income" | "expense", proyectado = false) {
    setError(null);
    setEditando({ ...VACIO(projectId), type: tipo, is_projected: proyectado });
  }

  function guardar(confirmar = false) {
    if (!editando) return;
    if (!editando.concept.trim() || editando.amount <= 0) {
      setError("Concepto y monto son obligatorios");
      return;
    }
    // Verificar duplicado cruzado: solo registros nuevos (sin id)
    if (!editando.id && !confirmar && expenses?.length) {
      const dup = expenses.find(
        (e) =>
          e.concept.trim().toLowerCase() === editando.concept.trim().toLowerCase() &&
          Number(e.amount) === Number(editando.amount)
      );
      if (dup) {
        setDupPresupuesto({ concept: dup.concept, amount: Number(dup.amount) });
        return;
      }
    }
    setDupPresupuesto(null);
    startTransition(async () => {
      try {
        const res = await guardarCashFlow({
          id: editando.id || undefined,
          project_id: projectId,
          date: editando.date,
          concept: editando.concept,
          type: editando.type,
          amount: Number(editando.amount),
          category: editando.category || null,
          is_projected: editando.is_projected,
          notes: editando.notes || null,
        });
        if (!res.ok) setError(res.error ?? "Error al guardar");
        else {
          setEditando(null);
          router.refresh();
        }
      } catch {
        setError("Error inesperado. Intenta de nuevo.");
      }
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    startTransition(async () => {
      await eliminarCashFlow(id);
      router.refresh();
    });
  }

  const exportarCSV = useCallback(() => {
    const filas = saldoReal.map(({ movimiento, saldo }) => ({
      fecha: movimiento.date,
      concepto: movimiento.concept,
      tipo: movimiento.type === "income" ? "Ingreso" : "Egreso",
      categoria: movimiento.category ?? "",
      monto: movimiento.amount,
      saldo,
      notas: movimiento.notes ?? "",
    }));
    const csv = toCSV(filas, [
      { key: "fecha", label: "Fecha" },
      { key: "concepto", label: "Concepto" },
      { key: "tipo", label: "Tipo" },
      { key: "categoria", label: "Categoría" },
      { key: "monto", label: "Monto" },
      { key: "saldo", label: "Saldo Acumulado" },
      { key: "notas", label: "Notas" },
    ]);
    descargarCSV(`cashflow-jeronimo-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }, [saldoReal]);

  return (
    <div className="space-y-6">
      {/* Hero: Presupuesto disponible */}
      <Card className={metricas.enAlerta ? "border-error" : "border-acento/30"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-textoSec">
            {metricas.enAlerta && <AlertTriangle className="h-4 w-4 text-error" />}
            Presupuesto disponible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${metricas.enAlerta ? "text-error" : "text-acento"}`}>
            {formatCOP(metricas.disponible)}
          </div>
          <div className="mt-2 space-y-1">
            <div className="w-full bg-superficieAlt rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${metricas.enAlerta ? "bg-error" : "bg-acento"}`}
                style={{ width: `${Math.min(100, Math.max(0, (metricas.disponible / presupuesto) * 100))}%` }}
              />
            </div>
            <p className="text-xs text-textoSec">
              {((metricas.disponible / presupuesto) * 100).toFixed(1)}% del presupuesto total ({formatCOP(presupuesto)})
              {metricas.enAlerta && ` · ⚠ bajo el 10%`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de egresos e ingresos */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-error" />
              Total egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{formatCOP(metricas.totalEgresos)}</div>
            <p className="text-xs text-textoSec mt-1">
              {reales.filter((m) => m.type === "expense").length} movimientos reales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-exito" />
              Total ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-exito">{formatCOP(metricas.totalIngresos)}</div>
            <p className="text-xs text-textoSec mt-1">
              {reales.filter((m) => m.type === "income").length} movimientos reales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards auxiliares */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Promedio diario de gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCOP(metricas.promedioDiario)}</div>
            <p className="text-xs text-textoSec mt-1">
              {metricas.variacion >= 0 ? (
                <TrendingUp className="h-3 w-3 inline text-error" />
              ) : (
                <TrendingDown className="h-3 w-3 inline text-exito" />
              )}{" "}
              {metricas.variacion.toFixed(1)}% vs día anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Runway</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isFinite(metricas.runway) ? `${metricas.runway} días` : "—"}
            </div>
            <p className="text-xs text-textoSec mt-1">al ritmo actual de gasto</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs vistas + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-md border border-borde p-1 bg-superficie">
          {(["diaria", "semanal", "mensual", "proyecciones"] as Vista[]).map((v) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                vista === v
                  ? "bg-acento text-fondo font-semibold"
                  : "text-textoSec hover:text-white"
              }`}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button size="sm" onClick={() => abrirNuevo("expense")}>
            <Plus className="h-4 w-4 mr-1" />
            Egreso
          </Button>
          <Button size="sm" variant="outline" onClick={() => abrirNuevo("income")}>
            <Plus className="h-4 w-4 mr-1" />
            Ingreso
          </Button>
          <Button size="sm" variant="outline" onClick={() => abrirNuevo("expense", true)}>
            <Clock className="h-4 w-4 mr-1" />
            Proyección
          </Button>
        </div>
      </div>

      {/* Vistas */}
      {vista === "diaria" && <VistaDiaria saldos={saldoReal} onEdit={setEditando} onDelete={eliminar} />}
      {vista === "semanal" && <VistaSemanal movimientos={reales} />}
      {vista === "mensual" && (
        <VistaMensual saldosReales={saldoReal} saldosProyectados={saldoProyectado} />
      )}
      {vista === "proyecciones" && (
        <VistaProyecciones
          proyectados={proyectados}
          onEdit={setEditando}
          onDelete={eliminar}
          onMaterializar={(id) =>
            startTransition(async () => {
              await materializarProyeccion(id);
              router.refresh();
            })
          }
        />
      )}

      {/* Modal CRUD */}
      {editando && (
        <Dialog open onClose={() => { setEditando(null); setDupPresupuesto(null); }}>
          <DialogHeader>
            <DialogTitle>
              {editando.id ? "Editar" : "Nuevo"}{" "}
              {editando.is_projected ? "(Proyección)" : ""}{" "}
              {editando.type === "income" ? "Ingreso" : "Egreso"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={editando.date}
                onChange={(e) => setEditando({ ...editando, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Concepto</Label>
              <Input
                value={editando.concept}
                onChange={(e) => setEditando({ ...editando, concept: e.target.value })}
                placeholder="Ej: Transporte Cali-Tuluá"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editando.type}
                  onChange={(e) =>
                    setEditando({ ...editando, type: e.target.value as "income" | "expense" })
                  }
                >
                  <option value="expense">Egreso</option>
                  <option value="income">Ingreso</option>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={editando.category ?? ""}
                  onChange={(e) => setEditando({ ...editando, category: e.target.value })}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
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
              <Label>Notas</Label>
              <Textarea
                value={editando.notes ?? ""}
                onChange={(e) => setEditando({ ...editando, notes: e.target.value })}
                rows={2}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editando.is_projected}
                onChange={(e) =>
                  setEditando({ ...editando, is_projected: e.target.checked })
                }
              />
              Es una proyección (movimiento futuro estimado)
            </label>
            {error && <p className="text-sm text-error">{error}</p>}

            {/* Banner alerta: duplicado en Presupuesto */}
            {dupPresupuesto && (
              <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
                <p className="font-semibold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> ¿Posible duplicado?
                </p>
                <p className="text-textoSec">
                  Ya existe en <strong>Presupuesto</strong> el concepto{" "}
                  <span className="text-white">&ldquo;{dupPresupuesto.concept}&rdquo;</span> por{" "}
                  <span className="text-white">{formatCOP(dupPresupuesto.amount)}</span>.
                  Registrarlo aquí también lo descontará <strong>dos veces</strong> del presupuesto.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setDupPresupuesto(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => guardar(true)}>
                    Sí, registrar de todas formas
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {editando.id && (
              <Button
                variant="outline"
                onClick={() => {
                  eliminar(editando.id);
                  setEditando(null);
                }}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={() => { setEditando(null); setDupPresupuesto(null); }} disabled={pending}>
              Cancelar
            </Button>
            {!dupPresupuesto && (
              <Button onClick={() => guardar()} disabled={pending}>
                {pending ? "Guardando..." : "Guardar"}
              </Button>
            )}
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

// =====================================================
// Vista Diaria — tabla cronológica con saldo acumulado
// =====================================================
function VistaDiaria({
  saldos,
  onEdit,
  onDelete,
}: {
  saldos: { saldo: number; movimiento: CashFlow }[];
  onEdit: (m: CashFlow) => void;
  onDelete: (id: string) => void;
}) {
  if (saldos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-textoSec">
          Aún no hay movimientos. Registra tu primer ingreso o egreso.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vista diaria — saldo acumulado</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-textoSec">
              <th className="py-2 px-2">Fecha</th>
              <th className="py-2 px-2">Concepto</th>
              <th className="py-2 px-2">Categoría</th>
              <th className="py-2 px-2 text-right">Ingreso</th>
              <th className="py-2 px-2 text-right">Egreso</th>
              <th className="py-2 px-2 text-right">Saldo</th>
              <th className="py-2 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {saldos.map(({ movimiento: m, saldo }) => (
              <tr key={m.id} className="border-b border-borde/50 hover:bg-superficieAlt">
                <td className="py-2 px-2">{m.date}</td>
                <td className="py-2 px-2 font-medium">{m.concept}</td>
                <td className="py-2 px-2">
                  {m.category && (
                    <Badge variant="outline" className="text-xs">
                      {m.category}
                    </Badge>
                  )}
                </td>
                <td className="py-2 px-2 text-right text-exito">
                  {m.type === "income" ? formatCOP(Number(m.amount)) : ""}
                </td>
                <td className="py-2 px-2 text-right text-error">
                  {m.type === "expense" ? formatCOP(Number(m.amount)) : ""}
                </td>
                <td className="py-2 px-2 text-right font-semibold text-acento">
                  {formatCOP(saldo)}
                </td>
                <td className="py-2 px-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(m)}
                      className="text-textoSec hover:text-acento"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="text-textoSec hover:text-error"
                      aria-label="Eliminar"
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
  );
}

// =====================================================
// Vista Semanal — cards resumen por semana
// =====================================================
function VistaSemanal({ movimientos }: { movimientos: CashFlow[] }) {
  const porSemana = useMemo(() => {
    const map = new Map<
      string,
      { ingresos: number; egresos: number; movs: CashFlow[] }
    >();
    for (const m of movimientos) {
      const sem = semanaISO(m.date);
      if (!map.has(sem)) map.set(sem, { ingresos: 0, egresos: 0, movs: [] });
      const acc = map.get(sem)!;
      if (m.type === "income") acc.ingresos += Number(m.amount);
      else acc.egresos += Number(m.amount);
      acc.movs.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [movimientos]);

  if (porSemana.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-textoSec">
          Sin movimientos para agrupar por semana.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {porSemana.map(([sem, datos]) => {
        const saldo = datos.ingresos - datos.egresos;
        return (
          <Card key={sem}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{sem}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-textoSec">Ingresos</span>
                <span className="text-exito">{formatCOP(datos.ingresos)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textoSec">Egresos</span>
                <span className="text-error">{formatCOP(datos.egresos)}</span>
              </div>
              <div className="flex justify-between border-t border-borde pt-1 mt-1">
                <span className="font-semibold">Saldo semana</span>
                <span className={`font-bold ${saldo >= 0 ? "text-acento" : "text-error"}`}>
                  {formatCOP(saldo)}
                </span>
              </div>
              <p className="text-xs text-textoSec pt-1">{datos.movs.length} movimientos</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// =====================================================
// Vista Mensual — gráfico saldo real vs proyectado
// =====================================================
function VistaMensual({
  saldosReales,
  saldosProyectados,
}: {
  saldosReales: { saldo: number; movimiento: CashFlow }[];
  saldosProyectados: { saldo: number; movimiento: CashFlow }[];
}) {
  const data = useMemo(() => {
    // Tomar el último saldo de cada día y construir serie
    const reales = new Map<string, number>();
    for (const { saldo, movimiento } of saldosReales) {
      reales.set(movimiento.date, saldo);
    }
    const proyectados = new Map<string, number>();
    for (const { saldo, movimiento } of saldosProyectados) {
      proyectados.set(movimiento.date, saldo);
    }
    const fechas = Array.from(
      new Set([...Array.from(reales.keys()), ...Array.from(proyectados.keys())])
    ).sort();
    let ultimoReal = 0;
    let ultimoProy = 0;
    return fechas.map((fecha) => {
      if (reales.has(fecha)) ultimoReal = reales.get(fecha)!;
      if (proyectados.has(fecha)) ultimoProy = proyectados.get(fecha)!;
      const tieneReal = reales.has(fecha);
      return {
        fecha,
        real: tieneReal ? ultimoReal : null,
        proyectado: ultimoProy,
      };
    });
  }, [saldosReales, saldosProyectados]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-textoSec">
          Sin datos para graficar tendencia mensual.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tendencia saldo real vs proyectado</CardTitle>
      </CardHeader>
      <CardContent style={{ height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
            <XAxis dataKey="fecha" stroke="#a3a3a3" fontSize={11} />
            <YAxis
              stroke="#a3a3a3"
              fontSize={11}
              tickFormatter={(v) => `${(Number(v) / 1_000_000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                color: "#fff",
              }}
              formatter={(value) => formatCOP(Number(value))}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="real"
              name="Saldo real"
              stroke="#d4af37"
              strokeWidth={2}
              dot={{ fill: "#d4af37", r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="proyectado"
              name="Saldo proyectado"
              stroke="#a8861e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =====================================================
// Vista Proyecciones — línea de tiempo de movimientos futuros
// =====================================================
function VistaProyecciones({
  proyectados,
  onEdit,
  onDelete,
  onMaterializar,
}: {
  proyectados: CashFlow[];
  onEdit: (m: CashFlow) => void;
  onDelete: (id: string) => void;
  onMaterializar: (id: string) => void;
}) {
  if (proyectados.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-textoSec">
          No hay proyecciones registradas. Usa el botón &quot;Proyección&quot; para
          registrar un gasto o ingreso futuro estimado.
        </CardContent>
      </Card>
    );
  }

  const ordenados = [...proyectados].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Línea de tiempo proyectada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ordenados.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded border border-dashed border-borde p-3 hover:bg-superficieAlt"
            >
              <Clock className="h-4 w-4 text-textoSec" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-textoSec">{m.date}</span>
                  <span className="font-medium">{m.concept}</span>
                  {m.category && (
                    <Badge variant="outline" className="text-xs">
                      {m.category}
                    </Badge>
                  )}
                </div>
                {m.notes && <p className="text-xs text-textoSec mt-1">{m.notes}</p>}
              </div>
              <div
                className={`text-sm font-semibold ${
                  m.type === "income" ? "text-exito" : "text-error"
                }`}
              >
                {m.type === "income" ? "+" : "-"}
                {formatCOP(Number(m.amount))}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onMaterializar(m.id)}
                  className="text-textoSec hover:text-exito"
                  aria-label="Confirmar (volver real)"
                  title="Marcar como real"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(m)}
                  className="text-textoSec hover:text-acento"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  className="text-textoSec hover:text-error"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
