"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Expense, CashFlow } from "@/lib/types";
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
import {
  guardarExpense,
  eliminarExpense,
} from "@/app/(dashboard)/presupuesto/actions";
import { guardarCashFlow } from "@/app/(dashboard)/cashflow/actions";

const CATEGORIAS = [
  { key: "desarrollo", label: "Desarrollo", presupuesto: 318_000, color: "#d4af37" },
  { key: "pre-produccion", label: "Pre-producción", presupuesto: 572_500, color: "#a8861e" },
  { key: "produccion", label: "Producción", presupuesto: 5_910_000, color: "#e6c558" },
  { key: "post-produccion", label: "Post-producción", presupuesto: 3_500_000, color: "#9c7a1c" },
];

const ESTADOS = ["planeado", "comprometido", "ejecutado", "cancelado"];
const TOTAL = 10_300_500;

const VACIO = (projectId: string): Expense => ({
  id: "",
  project_id: projectId,
  concept: "",
  category: "produccion",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  status: "planeado",
  receipt_url: null,
  created_at: "",
});

const VACIO_CASHFLOW = (projectId: string, tipo: "income" | "expense"): CashFlow => ({
  id: "",
  project_id: projectId,
  date: new Date().toISOString().slice(0, 10),
  concept: "",
  type: tipo,
  amount: 0,
  category: null,
  is_projected: false,
  notes: null,
  created_at: "",
});

// Normaliza nombres de categoría para tolerar espacios/mayúsculas/acentos
// distintos entre lo que se guarda en presupuesto (key) y en cash_flow (texto).
const norm = (s?: string | null) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function PresupuestoClient({
  expenses,
  cashFlow,
  projectId,
}: {
  expenses: Expense[];
  cashFlow: CashFlow[];
  projectId: string;
}) {
  // Lista visible de "Movimientos de caja reales" (solo no proyectados, top 20)
  const movimientosCaja = useMemo(
    () =>
      cashFlow
        .filter((m) => !m.is_projected)
        .slice(0, 20),
    [cashFlow]
  );
  const router = useRouter();
  const [filtroCat, setFiltroCat] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [editando, setEditando] = useState<Expense | null>(null);
  const [editandoCaja, setEditandoCaja] = useState<CashFlow | null>(null);
  const [seccionCaja, setSeccionCaja] = useState(true);
  const [pending, startTransition] = useTransition();
  const [pendingCaja, startCajaTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [errorCaja, setErrorCaja] = useState<string | null>(null);
  // Alertas de duplicado cruzado
  const [dupCaja, setDupCaja] = useState<CashFlow | null>(null);
  const [dupExpense, setDupExpense] = useState<Expense | null>(null);

  const filtrados = useMemo(() => {
    return expenses.filter((e) => {
      if (filtroCat && e.category !== filtroCat) return false;
      if (desde && e.date && e.date < desde) return false;
      if (hasta && e.date && e.date > hasta) return false;
      return true;
    });
  }, [expenses, filtroCat, desde, hasta]);

  // Egresos de flujo de caja también alimentan ejecutado/comprometido por
  // categoría. is_projected=false → ejecutado, is_projected=true → comprometido.
  const egresosCaja = useMemo(
    () => cashFlow.filter((m) => m.type === "expense"),
    [cashFlow]
  );

  const porCategoria = useMemo(() => {
    return CATEGORIAS.map((c) => {
      const keyN = norm(c.key);
      // Desde expenses (status)
      const ejExp = filtrados
        .filter((e) => e.category === c.key && e.status === "ejecutado")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const compExp = filtrados
        .filter((e) => e.category === c.key && e.status === "comprometido")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const plan = filtrados
        .filter((e) => e.category === c.key && e.status === "planeado")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      // Desde cash_flow (egresos)
      const cfDeCat = egresosCaja.filter((m) => norm(m.category) === keyN);
      const ejCF = cfDeCat
        .filter((m) => !m.is_projected)
        .reduce((acc, m) => acc + Number(m.amount), 0);
      const compCF = cfDeCat
        .filter((m) => m.is_projected)
        .reduce((acc, m) => acc + Number(m.amount), 0);
      const ej = ejExp + ejCF;
      const comp = compExp + compCF;
      return {
        ...c,
        ejecutado: ej,
        comprometido: comp,
        planeado: plan,
        pct: c.presupuesto > 0 ? Math.round((ej / c.presupuesto) * 100) : 0,
      };
    });
  }, [filtrados, egresosCaja]);

  const ejecutadoTotal = porCategoria.reduce((a, b) => a + b.ejecutado, 0);
  const comprometidoTotal = porCategoria.reduce((a, b) => a + b.comprometido, 0);
  const planeadoTotal = porCategoria.reduce((a, b) => a + b.planeado, 0);
  const pctTotal = Math.round((ejecutadoTotal / TOTAL) * 100);
  const disponible = TOTAL - ejecutadoTotal - comprometidoTotal;
  const alerta = pctTotal > 80;

  const onGuardar = (e: Expense, confirmar = false) => {
    setError(null);
    // Verificar duplicado cruzado: solo registros nuevos
    if (!e.id && !confirmar) {
      const dup = movimientosCaja.find(
        (m) =>
          m.concept.trim().toLowerCase() === e.concept.trim().toLowerCase() &&
          Number(m.amount) === Number(e.amount)
      );
      if (dup) {
        setDupCaja(dup);
        return;
      }
    }
    setDupCaja(null);
    startTransition(async () => {
      try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at: _ca, receipt_url: _r, ...rest } = e;
      const res = await guardarExpense({
        ...(id ? { id } : {}),
        ...rest,
        amount: Number(rest.amount) || 0,
      });
      if (!res.ok) setError(res.error ?? "Error guardando");
      else {
        setEditando(null);
        router.refresh();
      }
      } catch {
        setError("Error inesperado. Intenta de nuevo.");
      }
    });
  };

  const onGuardarCaja = (m: CashFlow, confirmar = false) => {
    setErrorCaja(null);
    if (!m.concept.trim() || m.amount <= 0) {
      setErrorCaja("Concepto y monto son obligatorios"); return;
    }
    // Verificar duplicado cruzado: solo registros nuevos
    if (!m.id && !confirmar) {
      const dup = expenses.find(
        (e) =>
          e.concept.trim().toLowerCase() === m.concept.trim().toLowerCase() &&
          Number(e.amount) === Number(m.amount)
      );
      if (dup) {
        setDupExpense(dup);
        return;
      }
    }
    setDupExpense(null);
    startCajaTransition(async () => {
      try {
        const res = await guardarCashFlow({
          id: m.id || undefined,
          project_id: projectId,
          date: m.date,
          concept: m.concept,
          type: m.type,
          amount: Number(m.amount),
          category: m.category,
          is_projected: false,
          notes: m.notes,
        });
        if (!res.ok) setErrorCaja(res.error ?? "Error guardando");
        else {
          setEditandoCaja(null);
          router.refresh();
        }
      } catch {
        setErrorCaja("Error inesperado. Intenta de nuevo.");
      }
    });
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    startTransition(async () => {
      await eliminarExpense(id);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCOP(TOTAL)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Ejecutado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-acento">
              {formatCOP(ejecutadoTotal)}
            </p>
            <p className="text-[10px] text-textoSec mt-1">solo gastos reales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Comprometido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">
              {formatCOP(comprometidoTotal)}
            </p>
            <p className="text-[10px] text-textoSec mt-1">
              aprobado, sin pagar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCOP(disponible)}</p>
            {planeadoTotal > 0 && (
              <p className="text-[10px] text-textoSec mt-1">
                + {formatCOP(planeadoTotal)} planeado
              </p>
            )}
          </CardContent>
        </Card>
        <Card className={alerta ? "border-error" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec flex items-center gap-1">
              {alerta ? (
                <AlertTriangle className="h-4 w-4 text-error" />
              ) : (
                <TrendingUp className="h-4 w-4 text-acento" />
              )}
              % Ejecutado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                alerta ? "text-error" : "text-acento"
              }`}
            >
              {pctTotal}%
            </p>
            {alerta && (
              <p className="text-xs text-error mt-1">
                Atención: superaste el 80% del presupuesto
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={porCategoria.filter((c) => c.ejecutado > 0)}
                  dataKey="ejecutado"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(d: { payload?: { pct?: number } }) =>
                    `${d.payload?.pct ?? 0}%`
                  }
                  stroke="#0a0a0a"
                >
                  {porCategoria
                    .filter((c) => c.ejecutado > 0)
                    .map((c) => (
                      <Cell key={c.key} fill={c.color} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    color: "#fff",
                  }}
                  formatter={(v) => formatCOP(Number(v ?? 0))}
                />
                <Legend wrapperStyle={{ color: "#a3a3a3", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presupuestado vs Ejecutado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={porCategoria.map((c) => ({
                  name: c.label,
                  Presupuesto: c.presupuesto,
                  Ejecutado: c.ejecutado,
                }))}
              >
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={11} />
                <YAxis
                  stroke="#a3a3a3"
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                  }}
                  formatter={(v) => formatCOP(Number(v ?? 0))}
                />
                <Legend wrapperStyle={{ color: "#a3a3a3", fontSize: 12 }} />
                <Bar dataKey="Presupuesto" fill="#3a3a3a" />
                <Bar dataKey="Ejecutado" fill="#d4af37" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + acción */}
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1">
          <Label className="text-xs text-textoSec">Categoría</Label>
          <Select
            value={filtroCat}
            onChange={(e) => setFiltroCat(e.target.value)}
            className="mt-1"
          >
            <option value="">Todas</option>
            {CATEGORIAS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-textoSec">Desde</Label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Hasta</Label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={() => {
            setError(null);
            setEditando(VACIO(projectId));
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nuevo gasto
        </Button>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Gastos · {filtrados.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borde text-textoSec">
                  <th className="text-left py-2 px-2 font-medium">Concepto</th>
                  <th className="text-left py-2 px-2 font-medium">Categoría</th>
                  <th className="text-left py-2 px-2 font-medium">Fecha</th>
                  <th className="text-right py-2 px-2 font-medium">Monto</th>
                  <th className="text-left py-2 px-2 font-medium">Estado</th>
                  <th className="text-right py-2 px-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e) => (
                  <tr key={e.id} className="border-b border-borde/40 hover:bg-superficieAlt/40">
                    <td className="py-2 px-2 font-medium">{e.concept}</td>
                    <td className="py-2 px-2 text-textoSec">{e.category}</td>
                    <td className="py-2 px-2 text-textoSec">{e.date ?? "—"}</td>
                    <td className="py-2 px-2 text-right">
                      {formatCOP(Number(e.amount))}
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          e.status === "ejecutado"
                            ? "success"
                            : e.status === "cancelado"
                            ? "danger"
                            : e.status === "comprometido"
                            ? "warning"
                            : "default"
                        }
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditando(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEliminar(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-error" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-textoSec py-6">
                      Sin gastos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!editando}
        onClose={() => { setEditando(null); setError(null); setDupCaja(null); }}
      >
        {editando && (
          <ExpenseForm
            inicial={editando}
            onCambio={setEditando}
            onGuardar={onGuardar}
            onCancelar={() => { setEditando(null); setDupCaja(null); }}
            pending={pending}
            error={error}
            dupCaja={dupCaja}
            onClearDup={() => setDupCaja(null)}
          />
        )}
      </Dialog>

      {/* — Sección Movimientos de Caja — */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setSeccionCaja((v) => !v)}
        >
          <CardTitle className="text-base flex items-center justify-between">
            <span>Movimientos de caja reales</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{movimientosCaja.length}</Badge>
              {seccionCaja ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {seccionCaja && (
          <CardContent className="space-y-3">
            <p className="text-xs text-textoSec">
              Registra ingresos y egresos reales. Se reflejan automáticamente en /flujo-de-caja y en los charts.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => { setErrorCaja(null); setEditandoCaja(VACIO_CASHFLOW(projectId, "income")); }}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" /> Nuevo ingreso
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setErrorCaja(null); setEditandoCaja(VACIO_CASHFLOW(projectId, "expense")); }}
              >
                <TrendingDown className="h-3.5 w-3.5 mr-1" /> Nuevo egreso
              </Button>
            </div>
            {movimientosCaja.length === 0 ? (
              <p className="text-sm text-textoSec py-4 text-center">Sin movimientos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-borde text-textoSec text-xs">
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Concepto</th>
                      <th className="text-left py-2 px-2">Tipo</th>
                      <th className="text-right py-2 px-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosCaja.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-borde/50 hover:bg-superficieAlt cursor-pointer"
                        onClick={() => { setErrorCaja(null); setEditandoCaja(m); }}
                      >
                        <td className="py-2 px-2 text-textoSec">{m.date}</td>
                        <td className="py-2 px-2">{m.concept}</td>
                        <td className="py-2 px-2">
                          <Badge
                            variant={m.type === "income" ? "success" : "danger"}
                            className="text-xs"
                          >
                            {m.type === "income" ? "Ingreso" : "Egreso"}
                          </Badge>
                        </td>
                        <td className={`py-2 px-2 text-right font-semibold ${m.type === "income" ? "text-exito" : "text-error"}`}>
                          {m.type === "income" ? "+" : "-"}{formatCOP(Number(m.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal: nuevo/editar movimiento de caja */}
      <Dialog open={!!editandoCaja} onClose={() => { setEditandoCaja(null); setErrorCaja(null); setDupExpense(null); }}>
        {editandoCaja && (
          <>
            <DialogHeader>
              <DialogTitle>
                {editandoCaja.id ? "Editar" : "Nuevo"} {editandoCaja.type === "income" ? "ingreso" : "egreso"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Concepto *</Label>
                <Input
                  value={editandoCaja.concept}
                  onChange={(e) => setEditandoCaja({ ...editandoCaja, concept: e.target.value })}
                  placeholder="Ej: Aporte UAO, Pago alojamiento..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={editandoCaja.date}
                    onChange={(e) => setEditandoCaja({ ...editandoCaja, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={editandoCaja.type}
                    onChange={(e) => setEditandoCaja({ ...editandoCaja, type: e.target.value as "income" | "expense" })}
                  >
                    <option value="income">Ingreso</option>
                    <option value="expense">Egreso</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Monto (COP) *</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="0"
                  value={editandoCaja.amount === 0 ? "" : editandoCaja.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditandoCaja({ ...editandoCaja, amount: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Select
                  value={editandoCaja.category ?? ""}
                  onChange={(e) => setEditandoCaja({ ...editandoCaja, category: e.target.value || null })}
                >
                  <option value="">— Sin categoría —</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                  <option value="financiacion">Financiación</option>
                  <option value="otros">Otros</option>
                </Select>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={editandoCaja.notes ?? ""}
                  onChange={(e) => setEditandoCaja({ ...editandoCaja, notes: e.target.value || null })}
                />
              </div>
              {errorCaja && <p className="text-sm text-error">{errorCaja}</p>}

              {/* Banner alerta: duplicado en Presupuesto */}
              {dupExpense && (
                <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
                  <p className="font-semibold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> ¿Posible duplicado?
                  </p>
                  <p className="text-textoSec">
                    Ya existe en <strong>Presupuesto</strong> el concepto{" "}
                    <span className="text-white">&ldquo;{dupExpense.concept}&rdquo;</span> por{" "}
                    <span className="text-white">{formatCOP(Number(dupExpense.amount))}</span>.
                    Registrarlo aquí también lo descontará <strong>dos veces</strong> del presupuesto.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setDupExpense(null)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => onGuardarCaja(editandoCaja, true)}>
                      Sí, registrar de todas formas
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditandoCaja(null); setErrorCaja(null); setDupExpense(null); }} disabled={pendingCaja}>
                Cancelar
              </Button>
              {!dupExpense && (
                <Button onClick={() => onGuardarCaja(editandoCaja)} disabled={pendingCaja}>
                  {pendingCaja ? "Guardando…" : "Guardar"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}

function ExpenseForm({
  inicial,
  onCambio,
  onGuardar,
  onCancelar,
  pending,
  error,
  dupCaja,
  onClearDup,
}: {
  inicial: Expense;
  onCambio: (e: Expense) => void;
  onGuardar: (e: Expense, confirmar?: boolean) => void;
  onCancelar: () => void;
  pending: boolean;
  error: string | null;
  dupCaja?: CashFlow | null;
  onClearDup?: () => void;
}) {
  const set = (k: keyof Expense, v: unknown) =>
    onCambio({ ...inicial, [k]: v });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{inicial.id ? "Editar gasto" : "Nuevo gasto"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          onGuardar(inicial);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Concepto *</Label>
          <Input
            required
            value={inicial.concept}
            onChange={(e) => set("concept", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Categoría *</Label>
          <Select
            required
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
          <Label className="text-xs text-textoSec">Estado</Label>
          <Select
            value={inicial.status}
            onChange={(e) => set("status", e.target.value)}
            className="mt-1"
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-textoSec">Monto (COP) *</Label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            required
            placeholder="0"
            value={inicial.amount === 0 ? "" : inicial.amount}
            onChange={(e) => {
              const v = e.target.value;
              set("amount", v === "" ? 0 : Number(v));
            }}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Fecha</Label>
          <Input
            type="date"
            value={inicial.date ?? ""}
            onChange={(e) => set("date", e.target.value || null)}
            className="mt-1"
          />
        </div>

        {error && <p className="md:col-span-2 text-sm text-error">{error}</p>}

        {/* Banner alerta: duplicado en Flujo de Caja */}
        {dupCaja && (
          <div className="md:col-span-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm space-y-2">
            <p className="font-semibold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> ¿Posible duplicado?
            </p>
            <p className="text-textoSec">
              Ya existe en <strong>Flujo de Caja</strong> el concepto{" "}
              <span className="text-white">&ldquo;{dupCaja.concept}&rdquo;</span> por{" "}
              <span className="text-white">{formatCOP(Number(dupCaja.amount))}</span>.
              Registrarlo aquí también lo descontará <strong>dos veces</strong> del presupuesto.
            </p>
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={onClearDup}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={() => onGuardar(inicial, true)}>
                Sí, registrar de todas formas
              </Button>
            </div>
          </div>
        )}

        {!dupCaja && (
          <DialogFooter className="md:col-span-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        )}
      </form>
    </>
  );
}
