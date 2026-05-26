"use client";

import { useMemo, useState, useTransition } from "react";
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
} from "lucide-react";
import type { Expense } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

export function PresupuestoClient({
  expenses,
  projectId,
}: {
  expenses: Expense[];
  projectId: string;
}) {
  const [filtroCat, setFiltroCat] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [editando, setEditando] = useState<Expense | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    return expenses.filter((e) => {
      if (filtroCat && e.category !== filtroCat) return false;
      if (desde && e.date && e.date < desde) return false;
      if (hasta && e.date && e.date > hasta) return false;
      return true;
    });
  }, [expenses, filtroCat, desde, hasta]);

  const porCategoria = useMemo(() => {
    return CATEGORIAS.map((c) => {
      // Solo 'ejecutado' cuenta como gasto real
      const ej = filtrados
        .filter((e) => e.category === c.key && e.status === "ejecutado")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const comp = filtrados
        .filter((e) => e.category === c.key && e.status === "comprometido")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      const plan = filtrados
        .filter((e) => e.category === c.key && e.status === "planeado")
        .reduce((acc, e) => acc + Number(e.amount), 0);
      return {
        ...c,
        ejecutado: ej,
        comprometido: comp,
        planeado: plan,
        pct: c.presupuesto > 0 ? Math.round((ej / c.presupuesto) * 100) : 0,
      };
    });
  }, [filtrados]);

  const ejecutadoTotal = porCategoria.reduce((a, b) => a + b.ejecutado, 0);
  const comprometidoTotal = porCategoria.reduce((a, b) => a + b.comprometido, 0);
  const planeadoTotal = porCategoria.reduce((a, b) => a + b.planeado, 0);
  const pctTotal = Math.round((ejecutadoTotal / TOTAL) * 100);
  const disponible = TOTAL - ejecutadoTotal - comprometidoTotal;
  const alerta = pctTotal > 80;

  const onGuardar = (e: Expense) => {
    setError(null);
    startTransition(async () => {
      // Excluimos campos manejados por la DB
      const { id, created_at: _ca, receipt_url: _r, ...rest } = e;
      void _ca; void _r;
      const res = await guardarExpense({
        ...(id ? { id } : {}),
        ...rest,
        amount: Number(rest.amount) || 0,
      });
      if (!res.ok) setError(res.error ?? "Error guardando");
      else setEditando(null);
    });
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    startTransition(async () => {
      await eliminarExpense(id);
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
                  {porCategoria.map((c, i) => (
                    <Cell key={i} fill={c.color} />
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
        onClose={() => {
          setEditando(null);
          setError(null);
        }}
      >
        {editando && (
          <ExpenseForm
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

function ExpenseForm({
  inicial,
  onCambio,
  onGuardar,
  onCancelar,
  pending,
  error,
}: {
  inicial: Expense;
  onCambio: (e: Expense) => void;
  onGuardar: (e: Expense) => void;
  onCancelar: () => void;
  pending: boolean;
  error: string | null;
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
