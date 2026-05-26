"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Pencil, AlertTriangle, ExternalLink, FileText, Wand2, ChevronDown, ChevronUp, Shield, FolderOpen, Link as LinkIcon } from "lucide-react";
import type { Contract, ContractTemplate, Project } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  guardarContrato,
  eliminarContrato,
  guardarPlantilla,
  eliminarPlantilla,
  generarDesdeTemplate,
} from "@/app/(dashboard)/contracts/actions";

const TIPOS: Contract["type"][] = ["locacion", "talento", "equipo", "seguro", "otro"];
const ESTADOS: Contract["status"][] = ["por_firmar", "vigente", "vencido"];

const VARIABLES_HINT = [
  "{{nombre}}", "{{rol}}", "{{cedula}}", "{{email}}", "{{telefono}}",
  "{{tarifa_diaria}}", "{{eps}}", "{{rh}}",
  "{{fecha_inicio}}", "{{fecha_fin}}", "{{fecha_hoy}}",
  "{{proyecto}}", "{{ubicacion}}",
];

const VACIO_CONTRATO = (projectId: string): Contract => ({
  id: "", project_id: projectId, name: "", type: "talento",
  sign_date: null, expiry_date: null, status: "por_firmar",
  file_url: null, notes: null, created_at: "",
});

const VACIO_TEMPLATE = (projectId: string): ContractTemplate => ({
  id: "", project_id: projectId, name: "", type: "talento", content: "", created_at: "",
});

function diasHasta(fecha: string | null): number | null {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(fecha + "T00:00:00").getTime() - hoy.getTime()) / 86400000);
}

type DriveFileLite = {
  id: string;
  drive_file_id: string;
  name: string;
  web_view_link: string | null;
};

interface Props {
  contracts: Contract[];
  templates: ContractTemplate[];
  crew: { id: string; name: string; role: string }[];
  driveFiles: DriveFileLite[];
  project: Project; // eslint-disable-line @typescript-eslint/no-unused-vars
  projectId: string;
}

export function ContractsClient({ contracts, templates, crew, driveFiles, projectId }: Props) {
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [editandoContrato, setEditandoContrato] = useState<Contract | null>(null);
  const [editandoTemplate, setEditandoTemplate] = useState<ContractTemplate | null>(null);
  const [seccionPlantillas, setSeccionPlantillas] = useState(false);
  const [seccionGenerar, setSeccionGenerar] = useState(false);
  const [templateSelId, setTemplateSelId] = useState<string>("");
  const [crewSelIds, setCrewSelIds] = useState<Set<string>>(new Set());
  const [resultado, setResultado] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() =>
    contracts.filter((c) => {
      if (filtroTipo && c.type !== filtroTipo) return false;
      if (filtroEstado && c.status !== filtroEstado) return false;
      return true;
    }), [contracts, filtroTipo, filtroEstado]);

  const porVencer = useMemo(() =>
    contracts.filter((c) => { const d = diasHasta(c.expiry_date); return d !== null && d >= 0 && d <= 7; }),
    [contracts]);

  const vencidos = useMemo(() =>
    contracts.filter((c) => { const d = diasHasta(c.expiry_date); return d !== null && d < 0; }),
    [contracts]);

  function guardarContratoFn() {
    if (!editandoContrato?.name.trim()) { setError("El nombre es obligatorio"); return; }
    startTransition(async () => {
      const r = await guardarContrato({
        id: editandoContrato.id || undefined,
        project_id: projectId, name: editandoContrato.name, type: editandoContrato.type,
        sign_date: editandoContrato.sign_date, expiry_date: editandoContrato.expiry_date,
        status: editandoContrato.status, file_url: editandoContrato.file_url, notes: editandoContrato.notes,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditandoContrato(null);
    });
  }

  function guardarTemplateFn() {
    if (!editandoTemplate?.name.trim() || !editandoTemplate?.content.trim()) {
      setError("Nombre y contenido son obligatorios"); return;
    }
    startTransition(async () => {
      const r = await guardarPlantilla({
        id: editandoTemplate.id || undefined,
        project_id: projectId, name: editandoTemplate.name,
        type: editandoTemplate.type, content: editandoTemplate.content,
      });
      if (!r.ok) setError(r.error ?? "Error al guardar");
      else setEditandoTemplate(null);
    });
  }

  function toggleCrew(id: string) {
    setCrewSelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function generarLote() {
    if (!templateSelId) { setError("Selecciona una plantilla"); return; }
    if (crewSelIds.size === 0) { setError("Selecciona al menos un miembro del crew"); return; }
    setError(null);
    startTransition(async () => {
      const r = await generarDesdeTemplate(templateSelId, Array.from(crewSelIds), projectId);
      if (r.errores.length > 0) {
        setResultado(`✓ ${r.creados} creados. Errores: ${r.errores.join(", ")}`);
      } else {
        setResultado(`✓ ${r.creados} contrato${r.creados !== 1 ? "s" : ""} generado${r.creados !== 1 ? "s" : ""} correctamente.`);
      }
      setCrewSelIds(new Set());
    });
  }

  // Plantillas legales CO se ordenan primero (ya viene ordenado del server)
  const plantillasLegales = templates.filter((t) => t.is_legal_co);
  const plantillasProyecto = templates.filter((t) => !t.is_legal_co);

  function abrirCreacion(via: "auto" | "drive" | "url") {
    setError(null);
    setResultado(null);
    if (via === "auto") {
      setSeccionGenerar(true);
      // Scroll suave a la sección
      setTimeout(() => {
        document
          .getElementById("seccion-generar")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }
    const base = VACIO_CONTRATO(projectId);
    if (via === "drive") {
      // Pre-marcar para que el usuario use el dropdown de Drive
      setEditandoContrato({ ...base, notes: "[Origen: Drive]" });
    } else {
      setEditandoContrato(base);
    }
  }

  return (
    <div className="space-y-4">
      {/* Selector inicial de 3 vías */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">¿Cómo quieres crear el contrato?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => abrirCreacion("auto")}
              className="text-left rounded-md border border-acento/60 bg-acento/5 hover:bg-acento/10 p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-acento" />
                <span className="font-semibold text-acento text-sm">
                  Auto-generar (Ley Colombia)
                </span>
                <Badge variant="accent" className="text-[10px] ml-auto">
                  Recomendado
                </Badge>
              </div>
              <p className="text-xs text-textoSec">
                Usa una plantilla legal pre-cargada (servicios artísticos,
                técnicos, cesión derechos, imagen, locación) y rellena los
                datos del crew automáticamente.
              </p>
            </button>

            <button
              onClick={() => abrirCreacion("drive")}
              className="text-left rounded-md border border-borde hover:border-acento/50 bg-superficie p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-4 w-4 text-acento" />
                <span className="font-semibold text-sm">
                  Desde plantilla en Drive
                </span>
              </div>
              <p className="text-xs text-textoSec">
                Usa un archivo PDF/DOCX que ya está en la carpeta Drive del
                proyecto y guárdalo como contrato.
              </p>
            </button>

            <button
              onClick={() => abrirCreacion("url")}
              className="text-left rounded-md border border-borde hover:border-acento/50 bg-superficie p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="h-4 w-4 text-acento" />
                <span className="font-semibold text-sm">
                  Subir / pegar URL
                </span>
              </div>
              <p className="text-xs text-textoSec">
                Sube el documento a Drive o donde prefieras y pega el enlace
                aquí para registrarlo manualmente.
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total contratos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{contracts.length}</div></CardContent>
        </Card>
        <Card className={porVencer.length > 0 ? "border-advertencia" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {porVencer.length > 0 && <AlertTriangle className="h-4 w-4 text-advertencia" />}
              Por vencer (≤7 días)
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-advertencia">{porVencer.length}</div></CardContent>
        </Card>
        <Card className={vencidos.length > 0 ? "border-error" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {vencidos.length > 0 && <AlertTriangle className="h-4 w-4 text-error" />}
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-error">{vencidos.length}</div></CardContent>
        </Card>
      </div>

      {/* — Sección Plantillas — */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setSeccionPlantillas((v) => !v)}
        >
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-acento" /> Plantillas de contratos
              <Badge variant="outline" className="ml-1">{templates.length}</Badge>
            </span>
            {seccionPlantillas ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {seccionPlantillas && (
          <CardContent className="space-y-3">
            <p className="text-xs text-textoSec">
              Variables disponibles:{" "}
              {VARIABLES_HINT.map((v) => (
                <code key={v} className="mx-0.5 px-1 bg-superficieAlt rounded text-acento text-[10px]">{v}</code>
              ))}
            </p>
            {templates.length === 0 ? (
              <p className="text-sm text-textoSec">Aún no hay plantillas.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => {
                  const legal = !!t.is_legal_co;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between p-2 rounded-md ${
                        legal ? "bg-acento/5 border border-acento/30" : "bg-superficieAlt"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {legal && <Shield className="h-3.5 w-3.5 text-acento shrink-0" />}
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.type}</Badge>
                        {legal && (
                          <Badge variant="accent" className="text-[10px]">
                            LEY CO
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!legal && (
                          <>
                            <button
                              onClick={() => { setError(null); setEditandoTemplate(t); }}
                              className="text-textoSec hover:text-acento p-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm("¿Eliminar esta plantilla?")) startTransition(async () => { await eliminarPlantilla(t.id); }); }}
                              className="text-textoSec hover:text-error p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(null); setEditandoTemplate(VACIO_TEMPLATE(projectId)); }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Nueva plantilla
            </Button>
          </CardContent>
        )}
      </Card>

      {/* — Sección Generar en lote — */}
      {templates.length > 0 && (
        <Card id="seccion-generar">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setSeccionGenerar((v) => !v)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-acento" /> Generar contratos en lote
              </span>
              {seccionGenerar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          {seccionGenerar && (
            <CardContent className="space-y-4">
              <p className="text-xs text-advertencia bg-advertencia/10 border border-advertencia/30 rounded px-3 py-2">
                ⚠ Las plantillas legales son apoyo y NO sustituyen asesoría
                jurídica formal. Revisa con un abogado antes de firmar.
              </p>
              {resultado && (
                <p className="text-sm text-exito bg-exito/10 border border-exito/30 rounded px-3 py-2">{resultado}</p>
              )}
              <div>
                <Label>Plantilla</Label>
                <Select value={templateSelId} onChange={(e) => setTemplateSelId(e.target.value)}>
                  <option value="">— Seleccionar plantilla —</option>
                  {plantillasLegales.length > 0 && (
                    <optgroup label="⚖ Plantillas legales Colombia">
                      {plantillasLegales.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {plantillasProyecto.length > 0 && (
                    <optgroup label="Plantillas del proyecto">
                      {plantillasProyecto.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Crew ({crewSelIds.size} seleccionados)</Label>
                  <button
                    className="text-xs text-acento hover:underline"
                    onClick={() =>
                      crewSelIds.size === crew.length
                        ? setCrewSelIds(new Set())
                        : setCrewSelIds(new Set(crew.map((c) => c.id)))
                    }
                  >
                    {crewSelIds.size === crew.length ? "Desmarcar todos" : "Seleccionar todos"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-52 overflow-y-auto border border-borde rounded-md p-2">
                  {crew.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-white py-0.5">
                      <input
                        type="checkbox"
                        checked={crewSelIds.has(m.id)}
                        onChange={() => toggleCrew(m.id)}
                        className="accent-acento"
                      />
                      <span>{m.name}</span>
                      <span className="text-xs text-textoTerc truncate">{m.role}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <Button onClick={generarLote} disabled={pending} className="w-full sm:w-auto">
                {pending ? "Generando…" : `Generar ${crewSelIds.size > 0 ? crewSelIds.size : ""} contrato${crewSelIds.size !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* — Lista de contratos — */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="max-w-[180px]">
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="max-w-[180px]">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
        </Select>
        <Button onClick={() => { setError(null); setEditandoContrato(VACIO_CONTRATO(projectId)); }} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Nuevo contrato
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            {contracts.length === 0 ? "Aún no hay contratos. Registra el primero o genera desde una plantilla." : "Sin resultados."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtrados.map((c) => {
            const dias = diasHasta(c.expiry_date);
            const alerta = dias !== null && dias < 7;
            const vencido = dias !== null && dias < 0;
            return (
              <Card key={c.id} className={vencido ? "border-error" : alerta ? "border-advertencia" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{c.type}</Badge>
                        <Badge variant={c.status === "vigente" ? "success" : c.status === "vencido" ? "danger" : "warning"} className="text-xs">
                          {c.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditandoContrato(c)} className="text-textoSec hover:text-acento p-1">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("¿Eliminar?")) startTransition(async () => { await eliminarContrato(c.id); }); }}
                        className="text-textoSec hover:text-error p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {c.sign_date && <p><span className="text-textoSec">Firma:</span> {c.sign_date}</p>}
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
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-acento hover:underline text-xs">
                      <ExternalLink className="h-3 w-3" /> Ver archivo
                    </a>
                  )}
                  {c.notes && <p className="text-xs text-textoSec line-clamp-2">{c.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: editar contrato */}
      {editandoContrato && (
        <Dialog open onClose={() => { setEditandoContrato(null); setError(null); }}>
          <DialogHeader>
            <DialogTitle>{editandoContrato.id ? "Editar" : "Nuevo"} contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={editandoContrato.name} onChange={(e) => setEditandoContrato({ ...editandoContrato, name: e.target.value })} placeholder="Ej: Locación Casa Tuluá" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editandoContrato.type} onChange={(e) => setEditandoContrato({ ...editandoContrato, type: e.target.value as Contract["type"] })}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={editandoContrato.status} onChange={(e) => setEditandoContrato({ ...editandoContrato, status: e.target.value as Contract["status"] })}>
                  {ESTADOS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha firma</Label>
                <Input type="date" value={editandoContrato.sign_date ?? ""} onChange={(e) => setEditandoContrato({ ...editandoContrato, sign_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Fecha vencimiento</Label>
                <Input type="date" value={editandoContrato.expiry_date ?? ""} onChange={(e) => setEditandoContrato({ ...editandoContrato, expiry_date: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>URL del archivo</Label>
              <Input
                value={editandoContrato.file_url ?? ""}
                onChange={(e) =>
                  setEditandoContrato({
                    ...editandoContrato,
                    file_url: e.target.value || null,
                  })
                }
                placeholder="https://drive.google.com/..."
              />
              {driveFiles.length > 0 && (
                <div className="mt-2">
                  <Label className="text-xs text-textoSec">
                    O usa un archivo ya cargado en Drive
                  </Label>
                  <Select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const f = driveFiles.find(
                        (df) => df.drive_file_id === e.target.value
                      );
                      if (f) {
                        setEditandoContrato({
                          ...editandoContrato,
                          file_url:
                            f.web_view_link ??
                            `https://drive.google.com/file/d/${f.drive_file_id}/view`,
                          name:
                            editandoContrato.name || f.name.replace(/\.[^.]+$/, ""),
                        });
                      }
                    }}
                  >
                    <option value="">— Seleccionar de Drive —</option>
                    {driveFiles.map((f) => (
                      <option key={f.id} value={f.drive_file_id}>
                        {f.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>Notas / Contenido</Label>
              <Textarea rows={3} value={editandoContrato.notes ?? ""} onChange={(e) => setEditandoContrato({ ...editandoContrato, notes: e.target.value || null })} />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditandoContrato(null); setError(null); }} disabled={pending}>Cancelar</Button>
            <Button onClick={guardarContratoFn} disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Modal: editar plantilla */}
      {editandoTemplate && (
        <Dialog open onClose={() => { setEditandoTemplate(null); setError(null); }} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoTemplate.id ? "Editar" : "Nueva"} plantilla</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre *</Label>
                <Input value={editandoTemplate.name} onChange={(e) => setEditandoTemplate({ ...editandoTemplate, name: e.target.value })} placeholder="Ej: Contrato de Talento" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editandoTemplate.type} onChange={(e) => setEditandoTemplate({ ...editandoTemplate, type: e.target.value as ContractTemplate["type"] })}>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Contenido de la plantilla *</Label>
                <span className="text-xs text-textoTerc">Variables: {VARIABLES_HINT.slice(0, 5).join(", ")}…</span>
              </div>
              <Textarea
                rows={12}
                value={editandoTemplate.content}
                onChange={(e) => setEditandoTemplate({ ...editandoTemplate, content: e.target.value })}
                placeholder={`CONTRATO DE PRESTACIÓN DE SERVICIOS\n\nEntre las partes:\nContratante: Cortometraje JERÓNIMO — {{proyecto}}\nContratista: {{nombre}}, identificado con C.C. {{cedula}}\nRol: {{rol}}\n\nVigencia: {{fecha_inicio}} al {{fecha_fin}}\nTarifa diaria: {{tarifa_diaria}}\n\nFirmado en Tuluá el {{fecha_hoy}}.`}
                className="font-mono text-xs"
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditandoTemplate(null); setError(null); }} disabled={pending}>Cancelar</Button>
            <Button onClick={guardarTemplateFn} disabled={pending}>{pending ? "Guardando…" : "Guardar plantilla"}</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
