"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Plus, Download, Pencil, Trash2, Check, AlertCircle } from "lucide-react";
import type { CrewMember } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DEPARTAMENTOS, departamentoDeRol } from "@/lib/departamentos";
import { toCSV, descargarCSV } from "@/lib/csv";
import { guardarCrew, eliminarCrew, alternarConfirmado } from "@/app/(dashboard)/crew/actions";

type Props = {
  crew: CrewMember[];
  projectId: string;
};

const VACIO = (projectId: string): CrewMember => ({
  id: "",
  project_id: projectId,
  name: "",
  role: "",
  email: null,
  phone: null,
  id_number: null,
  blood_type: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  eps: null,
  dietary_restrictions: null,
  notes: null,
  daily_rate: null,
  is_active: true,
  is_confirmed: true,
});

export function CrewClient({ crew, projectId }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroDepto, setFiltroDepto] = useState<string>("");
  const [seleccionado, setSeleccionado] = useState<CrewMember | null>(null);
  const [editando, setEditando] = useState<CrewMember | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return crew.filter((m) => {
      const depto = departamentoDeRol(m.role);
      if (filtroDepto && depto !== filtroDepto) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [crew, busqueda, filtroDepto]);

  const exportarCSV = () => {
    const csv = toCSV(filtrado, [
      { key: "name", label: "Nombre" },
      { key: "role", label: "Rol" },
      { key: "phone", label: "Teléfono" },
      { key: "email", label: "Email" },
      { key: "blood_type", label: "RH" },
      { key: "eps", label: "EPS" },
      { key: "emergency_contact_name", label: "Contacto emergencia" },
      { key: "emergency_contact_phone", label: "Tel emergencia" },
      { key: "dietary_restrictions", label: "Restricciones" },
      { key: "is_confirmed", label: "Confirmado" },
    ]);
    descargarCSV("crew-jeronimo", csv);
  };

  const onGuardar = (m: CrewMember) => {
    setError(null);
    startTransition(async () => {
      const { id, ...rest } = m;
      const res = await guardarCrew({
        ...(id ? { id } : {}),
        ...rest,
      });
      if (!res.ok) setError(res.error ?? "Error desconocido");
      else setEditando(null);
    });
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este miembro del crew? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const res = await eliminarCrew(id);
      if (!res.ok) setError(res.error ?? "Error eliminando");
      else {
        setSeleccionado(null);
        setEditando(null);
      }
    });
  };

  const toggleConfirmado = (m: CrewMember) => {
    startTransition(async () => {
      await alternarConfirmado(m.id, !m.is_confirmed);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textoSec" />
          <Input
            placeholder="Buscar por nombre, rol o email…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filtroDepto}
          onChange={(e) => setFiltroDepto(e.target.value)}
          className="md:w-56"
        >
          <option value="">Todos los departamentos</option>
          {DEPARTAMENTOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={exportarCSV} className="gap-2">
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button
          onClick={() => {
            setError(null);
            setEditando(VACIO(projectId));
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>RH</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrado.map((m) => (
              <TableRow
                key={m.id}
                onClick={() => setSeleccionado(m)}
                className="cursor-pointer"
              >
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-textoSec">{m.role}</TableCell>
                <TableCell className="text-textoSec text-xs">
                  {departamentoDeRol(m.role)}
                </TableCell>
                <TableCell className="text-textoSec">{m.phone ?? "—"}</TableCell>
                <TableCell>{m.blood_type ?? "—"}</TableCell>
                <TableCell>
                  {m.is_confirmed ? (
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" /> Confirmado
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> Pendiente
                    </Badge>
                  )}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditando(m)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtrado.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-textoSec py-8">
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: detalle */}
      <Dialog open={!!seleccionado && !editando} onClose={() => setSeleccionado(null)}>
        {seleccionado && (
          <>
            <DialogHeader>
              <DialogTitle>{seleccionado.name}</DialogTitle>
              <DialogDescription>
                {seleccionado.role} · {departamentoDeRol(seleccionado.role)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Detalle k="Teléfono" v={seleccionado.phone} />
              <Detalle k="Email" v={seleccionado.email} />
              <Detalle k="Cédula" v={seleccionado.id_number} />
              <Detalle k="Tipo de sangre (RH)" v={seleccionado.blood_type} />
              <Detalle k="EPS" v={seleccionado.eps} />
              <Detalle
                k="Contacto de emergencia"
                v={
                  seleccionado.emergency_contact_name
                    ? `${seleccionado.emergency_contact_name} · ${
                        seleccionado.emergency_contact_phone ?? "sin tel"
                      }`
                    : null
                }
              />
              <Detalle
                k="Restricciones alimentarias"
                v={seleccionado.dietary_restrictions}
              />
              <Detalle k="Notas" v={seleccionado.notes} />
              <div className="flex items-center justify-between pt-2 border-t border-borde">
                <span className="text-textoSec">Estado</span>
                <button
                  onClick={() => toggleConfirmado(seleccionado)}
                  disabled={pending}
                  className="cursor-pointer"
                >
                  {seleccionado.is_confirmed ? (
                    <Badge variant="success">Confirmado</Badge>
                  ) : (
                    <Badge variant="warning">Pendiente</Badge>
                  )}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => onEliminar(seleccionado.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
              </Button>
              <Button variant="outline" onClick={() => setEditando(seleccionado)}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      {/* Modal: edición */}
      <Dialog
        open={!!editando}
        onClose={() => {
          setEditando(null);
          setError(null);
        }}
        className="max-w-2xl"
      >
        {editando && (
          <CrewForm
            inicial={editando}
            onCambio={setEditando}
            onGuardar={onGuardar}
            pending={pending}
            error={error}
            onCancelar={() => {
              setEditando(null);
              setError(null);
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

function Detalle({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-3">
      <span className="text-textoSec shrink-0">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function CrewForm({
  inicial,
  onCambio,
  onGuardar,
  onCancelar,
  pending,
  error,
}: {
  inicial: CrewMember;
  onCambio: (m: CrewMember) => void;
  onGuardar: (m: CrewMember) => void;
  onCancelar: () => void;
  pending: boolean;
  error: string | null;
}) {
  const set = (k: keyof CrewMember, v: unknown) =>
    onCambio({ ...inicial, [k]: v });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{inicial.id ? "Editar crew" : "Nuevo crew"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar(inicial);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <Campo label="Nombre *">
          <Input
            required
            value={inicial.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Campo>
        <Campo label="Rol *">
          <Input
            required
            value={inicial.role}
            onChange={(e) => set("role", e.target.value)}
          />
        </Campo>
        <Campo label="Teléfono">
          <Input
            value={inicial.phone ?? ""}
            onChange={(e) => set("phone", e.target.value || null)}
          />
        </Campo>
        <Campo label="Email">
          <Input
            type="email"
            value={inicial.email ?? ""}
            onChange={(e) => set("email", e.target.value || null)}
          />
        </Campo>
        <Campo label="Cédula">
          <Input
            value={inicial.id_number ?? ""}
            onChange={(e) => set("id_number", e.target.value || null)}
          />
        </Campo>
        <Campo label="Tipo de sangre">
          <Input
            placeholder="O+, A-, …"
            value={inicial.blood_type ?? ""}
            onChange={(e) => set("blood_type", e.target.value || null)}
          />
        </Campo>
        <Campo label="EPS">
          <Input
            value={inicial.eps ?? ""}
            onChange={(e) => set("eps", e.target.value || null)}
          />
        </Campo>
        <Campo label="Tarifa diaria (COP)">
          <Input
            type="number"
            value={inicial.daily_rate ?? ""}
            onChange={(e) =>
              set("daily_rate", e.target.value ? Number(e.target.value) : null)
            }
          />
        </Campo>
        <Campo label="Contacto emergencia (nombre)">
          <Input
            value={inicial.emergency_contact_name ?? ""}
            onChange={(e) =>
              set("emergency_contact_name", e.target.value || null)
            }
          />
        </Campo>
        <Campo label="Contacto emergencia (tel)">
          <Input
            value={inicial.emergency_contact_phone ?? ""}
            onChange={(e) =>
              set("emergency_contact_phone", e.target.value || null)
            }
          />
        </Campo>
        <Campo label="Restricciones alimentarias" className="md:col-span-2">
          <Input
            value={inicial.dietary_restrictions ?? ""}
            onChange={(e) =>
              set("dietary_restrictions", e.target.value || null)
            }
          />
        </Campo>
        <Campo label="Notas" className="md:col-span-2">
          <Textarea
            value={inicial.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
          />
        </Campo>
        <label className="flex items-center gap-2 md:col-span-2 text-sm">
          <input
            type="checkbox"
            checked={inicial.is_confirmed}
            onChange={(e) => set("is_confirmed", e.target.checked)}
            className="accent-acento"
          />
          Confirmado
        </label>
        {error && (
          <p className="md:col-span-2 text-sm text-error">{error}</p>
        )}
        <DialogFooter className="md:col-span-2 mt-2">
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

function Campo({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-textoSec">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
