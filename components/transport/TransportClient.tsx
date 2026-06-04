"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Trash2, Pencil, Bus, Clock as ClockIcon, MapPin, User, Calendar, Coins } from "lucide-react";
import type { Transport } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCOP } from "@/lib/utils";
import {
  guardarTransporte,
  eliminarTransporte,
} from "@/app/(dashboard)/transport/actions";

type CrewLite = { id: string; name: string; role: string };

function getPicoYPlacaInfo(vehicleName: string, dateString: string | null) {
  if (!dateString) return null;
  // Extraer el último dígito del nombre/placa (ej: "Nissan March (HWS 637)")
  const digits = vehicleName.match(/\d/g);
  if (!digits || digits.length === 0) return null;
  const lastDigit = parseInt(digits[digits.length - 1], 10);
  
  const d = new Date(dateString + "T12:00:00");
  const day = d.getDay();
  
  // Rotación Cali Primer Semestre 2026
  const restrictions: Record<number, number[]> = {
    1: [1, 2], // Lunes
    2: [3, 4], // Martes
    3: [5, 6], // Miércoles
    4: [7, 8], // Jueves
    5: [9, 0]  // Viernes
  };

  const restrictedDigits = restrictions[day];
  if (restrictedDigits && restrictedDigits.includes(lastDigit)) {
    return "Tiene Pico y Placa";
  }
  return null;
}

const VACIO = (projectId: string): Transport => ({
  id: "",
  project_id: projectId,
  vehicle_name: "",
  driver: null,
  capacity: 4,
  date: new Date().toISOString().slice(0, 10),
  departure_time: "06:00",
  arrival_time: "07:30",
  route: null,
  crew_assigned: [],
  notes: null,
  created_at: "",
  allocated_money: 0,
  cash_flow_id: null,
});

export function TransportClient({
  vehicles,
  crew,
  projectId,
}: {
  vehicles: Transport[];
  crew: CrewLite[];
  projectId: string;
}) {
  const [editando, setEditando] = useState<Transport | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("Todos");

  const nombreDe = (id: string) => crew.find((c) => c.id === id)?.name ?? "—";

  // Extraer las fechas únicas con vehículos programados para el selector
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(vehicles.map((v) => v.date).filter(Boolean))) as string[];
    return dates.sort();
  }, [vehicles]);

  // Filtrar los vehículos según la fecha seleccionada
  const filteredVehicles = useMemo(() => {
    if (selectedDate === "Todos") return vehicles;
    if (selectedDate === "Sin fecha") return vehicles.filter((v) => !v.date);
    return vehicles.filter((v) => v.date === selectedDate);
  }, [vehicles, selectedDate]);

  function abrirNuevo() {
    setError(null);
    setEditando(VACIO(projectId));
  }

  function toggleCrew(id: string) {
    if (!editando) return;
    const set = new Set(editando.crew_assigned);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setEditando({ ...editando, crew_assigned: Array.from(set) });
  }

  function guardar() {
    if (!editando || !editando.vehicle_name.trim()) {
      setError("Nombre del vehículo es obligatorio");
      return;
    }
    startTransition(async () => {
      const r = await guardarTransporte({
        id: editando.id || undefined,
        project_id: projectId,
        vehicle_name: editando.vehicle_name,
        driver: editando.driver,
        capacity: editando.capacity,
        date: editando.date,
        departure_time: editando.departure_time,
        arrival_time: editando.arrival_time,
        route: editando.route,
        crew_assigned: editando.crew_assigned,
        notes: editando.notes,
        allocated_money: editando.allocated_money,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditando(null);
    });
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este vehículo? Esto también removerá su egreso del flujo de caja si tenía asignado presupuesto.")) return;
    startTransition(async () => {
      await eliminarTransporte(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Selector de Fechas Premium */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-thin">
          <span className="text-xs text-textoSec uppercase tracking-wider font-semibold shrink-0">Filtrar:</span>
          <button
            onClick={() => setSelectedDate("Todos")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
              selectedDate === "Todos"
                ? "bg-acento text-black border-acento font-bold shadow-md shadow-acento/20"
                : "bg-superficie border-borde text-textoSec hover:border-acento/50"
            }`}
          >
            Todos ({vehicles.length})
          </button>
          {uniqueDates.map((d) => {
            const count = vehicles.filter((v) => v.date === d).length;
            const parts = d.split("-");
            const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                  selectedDate === d
                    ? "bg-acento text-black border-acento font-bold shadow-md shadow-acento/20"
                    : "bg-superficie border-borde text-textoSec hover:border-acento/50"
                }`}
              >
                {formattedDate} ({count})
              </button>
            );
          })}
          {vehicles.some((v) => !v.date) && (
            <button
              onClick={() => setSelectedDate("Sin fecha")}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                selectedDate === "Sin fecha"
                  ? "bg-acento text-black border-acento font-bold shadow-md shadow-acento/20"
                  : "bg-superficie border-borde text-textoSec hover:border-acento/50"
              }`}
            >
              Sin fecha ({vehicles.filter((v) => !v.date).length})
            </button>
          )}
        </div>

        <Button onClick={abrirNuevo} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Nuevo vehículo
        </Button>
      </div>

      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            No hay vehículos registrados para {selectedDate === "Todos" ? "este proyecto" : selectedDate === "Sin fecha" ? "sin fecha asignada" : `el día ${selectedDate}`}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((v) => {
            const ocupacion = v.crew_assigned.length;
            const cap = v.capacity ?? 0;
            const sobreocupado = cap > 0 && ocupacion > cap;
            const picoYPlaca = getPicoYPlacaInfo(v.vehicle_name, v.date);
            
            return (
              <Card
                key={v.id}
                className={sobreocupado || picoYPlaca ? "border-error" : ""}
              >

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      <Bus className="h-5 w-5 text-acento mt-0.5 shrink-0" />
                      <div>
                        <CardTitle className="text-base leading-tight">{v.vehicle_name}</CardTitle>
                        {v.driver && (
                          <p className="text-sm text-textoSec mt-1 flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {v.driver}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={sobreocupado ? "danger" : "outline"}
                        className="text-xs shrink-0"
                      >
                        {ocupacion}/{cap || "—"}
                      </Badge>
                      {picoYPlaca && (
                        <Badge variant="danger" className="text-[10px]">
                          {picoYPlaca}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {v.date && (
                    <p className="text-sm flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-acento" />
                      <span className="text-textoSec">Fecha:</span>{" "}
                      <span className="font-medium">{v.date}</span>
                    </p>
                  )}
                  {(v.departure_time || v.arrival_time) && (
                    <p className="text-sm flex items-center gap-1.5">
                      <ClockIcon className="h-3.5 w-3.5 text-textoSec" />
                      <span className="text-textoSec">Horario:</span>{" "}
                      <span>
                        {v.departure_time || "—"}
                        {v.arrival_time ? ` → ${v.arrival_time}` : ""}
                      </span>
                    </p>
                  )}
                  {v.route && (
                    <p className="text-sm flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-textoSec" />
                      {v.route}
                    </p>
                  )}
                  {v.allocated_money !== null && Number(v.allocated_money) > 0 && (
                    <div className="text-xs font-bold text-acento bg-acento/10 border border-acento/20 px-2 py-1 rounded w-fit flex items-center gap-1.5 mt-1">
                      <Coins className="h-3.5 w-3.5 text-acento" />
                      <span>Presupuesto:</span>
                      <span>{formatCOP(Number(v.allocated_money))}</span>
                    </div>
                  )}
                  {v.crew_assigned.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-textoSec mb-1.5">Crew asignado:</p>
                      <div className="flex flex-wrap gap-1">
                        {v.crew_assigned.map((id) => (
                          <span
                            key={id}
                            className="text-xs bg-superficieAlt px-2 py-0.5 rounded"
                          >
                            {nombreDe(id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {v.notes && (
                    <p className="text-sm text-textoSec pt-1 whitespace-pre-line">{v.notes}</p>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-borde mt-2">
                    <button
                      onClick={() => setEditando(v)}
                      className="text-sm text-textoSec hover:text-acento flex items-center gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => eliminar(v.id)}
                      className="text-sm text-textoSec hover:text-error ml-auto flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
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
            <DialogTitle>{editando.id ? "Editar" : "Nuevo"} vehículo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre del vehículo</Label>
              <Input
                value={editando.vehicle_name}
                onChange={(e) =>
                  setEditando({ ...editando, vehicle_name: e.target.value })
                }
                placeholder="Van producción / Camioneta arte..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Conductor</Label>
                <Input
                  value={editando.driver ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, driver: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Capacidad</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  value={
                    editando.capacity === null || editando.capacity === 0
                      ? ""
                      : editando.capacity
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditando({
                      ...editando,
                      capacity: v === "" ? null : Number(v),
                    });
                  }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={editando.date ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, date: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Ruta</Label>
                <Input
                  value={editando.route ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, route: e.target.value || null })
                  }
                  placeholder="Cali → Tuluá"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora salida prevista</Label>
                <Input
                  type="time"
                  value={editando.departure_time ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, departure_time: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Hora llegada prevista</Label>
                <Input
                  type="time"
                  value={editando.arrival_time ?? ""}
                  onChange={(e) =>
                    setEditando({ ...editando, arrival_time: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Presupuesto del vehículo (COP)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Ej: 150000"
                value={
                  editando.allocated_money === null || editando.allocated_money === 0
                    ? ""
                    : editando.allocated_money
                }
                onChange={(e) => {
                  const v = e.target.value;
                  setEditando({
                    ...editando,
                    allocated_money: v === "" ? 0 : Number(v),
                  });
                }}
              />
              <p className="text-[10px] text-textoSec mt-1">
                Se registrará automáticamente como un egreso de producción en el flujo de caja y restará del presupuesto disponible.
              </p>
            </div>

            <div>
              <Label>
                Crew asignado ({editando.crew_assigned.length}
                {editando.capacity ? `/${editando.capacity}` : ""})
              </Label>
              <div className="grid grid-cols-2 gap-1 mt-1 max-h-40 overflow-y-auto rounded border border-borde p-2 bg-superficieAlt">
                {crew.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-superficie rounded px-1 py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={editando.crew_assigned.includes(c.id)}
                      onChange={() => toggleCrew(c.id)}
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={editando.notes ?? ""}
                onChange={(e) =>
                  setEditando({ ...editando, notes: e.target.value || null })
                }
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
