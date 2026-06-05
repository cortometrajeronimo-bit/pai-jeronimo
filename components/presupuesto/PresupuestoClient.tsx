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
  { key: "honorarios", label: "Honorarios y Equipo Técnico", presupuesto: 4_500_000, color: "#d4af37" },
  { key: "transportes", label: "Transportes", presupuesto: 1_832_000, color: "#a8861e" },
  { key: "catering", label: "Catering", presupuesto: 1_500_000, color: "#e6c558" },
  { key: "arte-vestuario", label: "Arte y Vestuario", presupuesto: 1_200_000, color: "#9c7a1c" },
  { key: "materiales-locaciones", label: "Materiales y Locaciones", presupuesto: 1_132_500, color: "#b8962e" },
  { key: "imprevistos", label: "Imprevistos", presupuesto: 136_000, color: "#806010" },
];

const MAPA_CASHFLOW: Record<string, string> = {
  "honorarios": "honorarios",
  "transportes": "transportes",
  "catering": "catering",
  "arte-vestuario": "arte-vestuario",
  "materiales-locaciones": "materiales-locaciones",
  "imprevistos": "imprevistos",
};

const ESTADOS = ["planeado", "comprometido", "ejecutado", "cancelado"];
const TOTAL = 10_300_500;

const VACIO = (projectId: string): Expense => ({
  id: "",
  project_id: projectId,
  concept: "",
  category: "honorarios",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  status: "planeado",
  receipt_url: null,
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
  const [categoriaExpandida, setCategoriaExpandida] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Alertas de duplicado cruzado
  const [dupCaja, setDupCaja] = useState<CashFlow | null>(null);

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
      const cfDeCat = egresosCaja.filter((m) => {
        const normM = norm(m.category);
        const mapped = MAPA_CASHFLOW[normM] || normM;
        return mapped === keyN;
      });
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
        {/* Card 1: Presupuesto Total */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Presupuesto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCOP(TOTAL)}</p>
            <p className="text-[10px] text-textoSec mt-1">Total planificado</p>
          </CardContent>
        </Card>

        {/* Card 2: Ejecutado (Real) */}
        <Card className={alerta ? "border-error/40" : "border-acento/20"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-textoSec flex items-center gap-1.5">
                {alerta && <AlertTriangle className="h-4 w-4 text-error" />}
                Ejecutado (Real)
              </CardTitle>
              <Badge variant={alerta ? "danger" : "accent"} className="text-[10px] font-bold">
                {pctTotal}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${alerta ? "text-error" : "text-acento"}`}>
              {formatCOP(ejecutadoTotal)}
            </p>
            <p className="text-[10px] text-textoSec mt-1">Egresos reales pagados</p>
          </CardContent>
        </Card>

        {/* Card 3: Proyectado / Comprometido */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Proyectado / Comprometido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-400">
              {formatCOP(comprometidoTotal)}
            </p>
            <p className="text-[10px] text-textoSec mt-1">Egresos futuros y comprometidos</p>
          </CardContent>
        </Card>

        {/* Card 4: Disponible Actual (Real) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Disponible Actual (Real)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{formatCOP(TOTAL - ejecutadoTotal)}</p>
            <p className="text-[10px] text-textoSec mt-1">Caja libre real en este momento</p>
          </CardContent>
        </Card>

        {/* Card 5: Disponible Neto */}
        <Card className={disponible < TOTAL * 0.1 ? "border-error/40" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-textoSec">Disponible Neto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${disponible < TOTAL * 0.1 ? "text-error" : "text-white"}`}>
              {formatCOP(disponible)}
            </p>
            <p className="text-[10px] text-textoSec mt-1">Restando comprometido y proyecciones</p>
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

      {/* Vista de Gastos Agrupados (Acordeón) */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight text-white mb-2 flex justify-between items-end">
          <span>Desglose por Categorías</span>
          <span className="text-sm font-normal text-textoSec">{filtrados.length} gastos en total</span>
        </h2>
        {CATEGORIAS.filter(c => !filtroCat || c.key === filtroCat).map((cat) => {
          const gastosEst = filtrados.filter(e => e.category === cat.key);
          const gastosCaja = egresosCaja
            .filter(m => (MAPA_CASHFLOW[norm(m.category)] || norm(m.category)) === norm(cat.key))
            .map(m => ({
              id: m.id,
              concept: m.concept + " (Caja)",
              date: m.date,
              amount: m.amount,
              category: cat.key,
              status: m.is_projected ? "comprometido" : "ejecutado",
              isFromCashFlow: true
            } as unknown as Expense));
          
          const combinedList = [...gastosEst, ...gastosCaja];
          const isExpanded = categoriaExpandida === cat.key;
          
          // Usar el total calculado en porCategoria para consistencia
          const dataCat = porCategoria.find(c => c.key === cat.key);
          const totalCat = dataCat ? dataCat.ejecutado + dataCat.comprometido + dataCat.planeado : 0;

          return (
            <Card key={cat.key} className="overflow-hidden border-borde/50 hover:border-borde transition-colors">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer select-none bg-superficie hover:bg-superficieAlt"
                onClick={() => setCategoriaExpandida(isExpanded ? null : cat.key)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-white">{cat.label}</h3>
                  <Badge variant="outline" className="text-xs">{combinedList.length}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-acento">{formatCOP(totalCat)}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-textoSec" /> : <ChevronDown className="h-4 w-4 text-textoSec" />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-borde bg-superficie/30">
                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-borde/40 text-textoSec">
                          <th className="text-left py-2 px-3 font-medium">Concepto</th>
                          <th className="text-left py-2 px-3 font-medium">Fecha</th>
                          <th className="text-right py-2 px-3 font-medium">Monto</th>
                          <th className="text-left py-2 px-3 font-medium">Estado</th>
                          <th className="text-right py-2 px-3 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedList.map((e) => (
                          <tr key={e.id} className="border-b border-borde/20 hover:bg-superficieAlt/60 transition-colors">
                            <td className="py-2.5 px-3 font-medium">{e.concept}</td>
                            <td className="py-2.5 px-3 text-textoSec">{e.date ?? "—"}</td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCOP(Number(e.amount))}
                            </td>
                            <td className="py-2.5 px-3">
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
                                className="text-[10px]"
                              >
                                {e.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {/* @ts-expect-error isFromCashFlow is a custom flag */}
                              {!e.isFromCashFlow && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-1.5 shrink-0"
                                    onClick={(ev) => { ev.stopPropagation(); setEditando(e); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-1.5 shrink-0"
                                    onClick={(ev) => { ev.stopPropagation(); onEliminar(e.id); }}
                                  >
                                    <Trash2 className="h-4 w-4 text-danger" />
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                        {combinedList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-textoSec py-6">
                              Sin gastos en esta categoría.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

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
