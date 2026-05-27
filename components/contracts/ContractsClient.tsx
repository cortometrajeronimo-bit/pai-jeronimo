"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, AlertTriangle, ExternalLink, FileText, Wand2, ChevronDown, ChevronUp, Shield, FolderOpen, Link as LinkIcon, Eye, Download, Mail, Upload, FileCheck2, Search, CheckCircle2 } from "lucide-react";
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
  enviarContratoPorEmail,
} from "@/app/(dashboard)/contracts/actions";
import {
  subirPlantillaDOCX,
  subirContratoTerminado,
  generarContratosDOCXMasivo,
  marcarContratoFirmado,
  obtenerUrlContrato,
  eliminarContratoConArchivo,
  eliminarPlantillaDOCX,
} from "@/app/(dashboard)/contracts/actions-upload";
import { DEPARTAMENTOS, departamentoDeRol } from "@/lib/departamentos";

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

export function ContractsClient({ contracts, templates, crew, driveFiles, projectId, project }: Props) {
  const router = useRouter();
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [filtroDeptoLista, setFiltroDeptoLista] = useState<string>("");
  const [busqueda, setBusqueda] = useState<string>("");
  const [editandoContrato, setEditandoContrato] = useState<Contract | null>(null);
  const [editandoTemplate, setEditandoTemplate] = useState<ContractTemplate | null>(null);
  const [seccionPlantillas, setSeccionPlantillas] = useState(false);
  const [seccionGenerar, setSeccionGenerar] = useState(false);
  const [templateSelId, setTemplateSelId] = useState<string>("");
  const [crewSelIds, setCrewSelIds] = useState<Set<string>>(new Set());
  const [filtroDeptoGenerar, setFiltroDeptoGenerar] = useState<string>("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [advertencias, setAdvertencias] = useState<Record<string, string[]>>({});
  const [previsualizando, setPrevisualizando] = useState<Contract | null>(null);
  const [enviando, setEnviando] = useState<Contract | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingEmail, startEmailTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Estado para upload de plantilla DOCX y de contrato terminado
  const [uploadPlantillaOpen, setUploadPlantillaOpen] = useState(false);
  const [uploadContratoOpen, setUploadContratoOpen] = useState(false);

  // Mapa rápido id→crew para resolver departamento desde el contrato
  const crewById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; role: string }>();
    crew.forEach((c) => m.set(c.id, c));
    return m;
  }, [crew]);

  // Resuelve el departamento de un contrato: vía crew_member_id (preciso)
  // o por coincidencia de nombre con el crew como fallback.
  function deptoDeContrato(c: Contract): string {
    const cm = c.crew_member_id ? crewById.get(c.crew_member_id) : null;
    if (cm) return departamentoDeRol(cm.role);
    // Fallback: extrae "Nombre" del formato "Plantilla — Nombre"
    const partes = c.name.split(" — ");
    const posibleNombre = partes[partes.length - 1]?.trim().toLowerCase();
    if (posibleNombre) {
      const match = crew.find((m) => m.name.toLowerCase() === posibleNombre);
      if (match) return departamentoDeRol(match.role);
    }
    return "Otros";
  }

  // Estado visual derivado. Vencido tiene prioridad (es alerta);
  // luego firmado; luego faltan campos; luego pendiente; resto = borrador.
  function estadoVisual(c: Contract): "vencido" | "firmado" | "faltan" | "pendiente" | "borrador" {
    if (c.status === "vencido") return "vencido";
    if (c.signed_at || c.status === "vigente") return "firmado";
    if ((c.missing_fields?.length ?? 0) > 0) return "faltan";
    if (c.status === "por_firmar") return "pendiente";
    return "borrador";
  }

  const filtrados = useMemo(() =>
    contracts.filter((c) => {
      if (filtroTipo && c.type !== filtroTipo) return false;
      if (filtroEstado) {
        const ev = estadoVisual(c);
        if (filtroEstado === "firmado" && ev !== "firmado") return false;
        if (filtroEstado === "pendiente" && ev !== "pendiente") return false;
        if (filtroEstado === "faltan" && ev !== "faltan") return false;
        if (filtroEstado === "vencido" && ev !== "vencido") return false;
        if (filtroEstado === "borrador" && ev !== "borrador") return false;
      }
      if (filtroDeptoLista && deptoDeContrato(c) !== filtroDeptoLista) return false;
      if (busqueda) {
        const q = busqueda.trim().toLowerCase();
        if (!c.name.toLowerCase().includes(q)) return false;
      }
      return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [contracts, filtroTipo, filtroEstado, filtroDeptoLista, busqueda, crewById]);

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
    setError(null); setResultado(null); setAdvertencias({});
    const tpl = templates.find((t) => t.id === templateSelId);
    const esDocx = tpl?.source_type === "docx";
    startTransition(async () => {
      const r = esDocx
        ? await generarContratosDOCXMasivo(templateSelId, Array.from(crewSelIds), projectId)
        : await generarDesdeTemplate(templateSelId, Array.from(crewSelIds), projectId);
      if (r.errores.length > 0) {
        setResultado(`✓ ${r.creados} creados. Errores: ${r.errores.join(", ")}`);
      } else {
        setResultado(`✓ ${r.creados} contrato${r.creados !== 1 ? "s" : ""} generado${r.creados !== 1 ? "s" : ""} correctamente.`);
      }
      if (r.advertencias && Object.keys(r.advertencias).length > 0) {
        setAdvertencias(r.advertencias);
      }
      setCrewSelIds(new Set());
    });
  }

  // Descarga un archivo guardado en Supabase Storage (contratos subidos / DOCX generados)
  async function descargarArchivoStorage(c: Contract) {
    if (!c.storage_path) { setError("Este contrato no tiene archivo asociado."); return; }
    const r = await obtenerUrlContrato("contracts", c.storage_path);
    if (!r.ok) { setError(r.error); return; }
    window.open(r.url, "_blank", "noopener");
  }

  // Alterna estado firmado/pendiente desde la lista
  function toggleFirmado(c: Contract) {
    const yaFirmado = !!c.signed_at || c.status === "vigente";
    startTransition(async () => {
      const r = await marcarContratoFirmado(c.id, !yaFirmado);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  // Elimina un contrato (con archivo en Storage si existe)
  function eliminarContratoUnificado(c: Contract) {
    if (!confirm("¿Eliminar este contrato? Si tiene archivo subido también se borrará.")) return;
    startTransition(async () => {
      const r = c.storage_path
        ? await eliminarContratoConArchivo(c.id)
        : await eliminarContrato(c.id);
      if (!("ok" in r) || !r.ok) setError("error" in r ? r.error : "Error eliminando");
      else router.refresh();
    });
  }

  async function descargarPDF(c: Contract) {
    const { descargarContratoPDF } = await import("@/components/contracts/ContractPDF");
    await descargarContratoPDF(c, project?.name ?? "JERÓNIMO");
  }

  function enviarEmail(c: Contract, destino: "crew" | "proyecto") {
    setEmailMsg(null);
    startEmailTransition(async () => {
      const r = await enviarContratoPorEmail(c.id, destino);
      setEmailMsg(r.ok ? "✓ Correo enviado correctamente." : `Error: ${r.error}`);
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
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => abrirCreacion("auto")}
              className="text-left rounded-md border border-acento/60 bg-acento/5 hover:bg-acento/10 p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-acento" />
                <span className="font-semibold text-acento text-sm">
                  Auto-generar (Ley CO)
                </span>
              </div>
              <p className="text-xs text-textoSec">
                Plantilla legal pre-cargada + datos del crew automáticos.
              </p>
            </button>

            <button
              onClick={() => { setError(null); setUploadPlantillaOpen(true); }}
              className="text-left rounded-md border border-acento/60 bg-acento/5 hover:bg-acento/10 p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload className="h-4 w-4 text-acento" />
                <span className="font-semibold text-acento text-sm">
                  Subir plantilla .docx
                </span>
                <Badge variant="accent" className="text-[10px] ml-auto">
                  Nuevo
                </Badge>
              </div>
              <p className="text-xs text-textoSec">
                Sube tu plantilla con <code className="text-acento">{"{{nombre}}"}</code>,{" "}
                <code className="text-acento">{"{{cedula}}"}</code>… y se rellenan por crew.
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
                Archivo PDF/DOCX ya en la carpeta Drive del proyecto.
              </p>
            </button>

            <button
              onClick={() => abrirCreacion("url")}
              className="text-left rounded-md border border-borde hover:border-acento/50 bg-superficie p-3 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="h-4 w-4 text-acento" />
                <span className="font-semibold text-sm">
                  Pegar URL
                </span>
              </div>
              <p className="text-xs text-textoSec">
                Registra un enlace externo manualmente.
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
                        {t.source_type === "docx" && (
                          <FileText className="h-3.5 w-3.5 text-acento shrink-0" />
                        )}
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.type}</Badge>
                        {legal && (
                          <Badge variant="accent" className="text-[10px]">
                            LEY CO
                          </Badge>
                        )}
                        {t.source_type === "docx" && (
                          <Badge variant="accent" className="text-[10px]">
                            DOCX
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!legal && t.source_type !== "docx" && (
                          <button
                            onClick={() => { setError(null); setEditandoTemplate(t); }}
                            className="text-textoSec hover:text-acento p-1"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!legal && (
                          <button
                            onClick={() => {
                              if (!confirm("¿Eliminar esta plantilla?")) return;
                              startTransition(async () => {
                                if (t.source_type === "docx") await eliminarPlantillaDOCX(t.id);
                                else await eliminarPlantilla(t.id);
                                router.refresh();
                              });
                            }}
                            className="text-textoSec hover:text-error p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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
              {Object.keys(advertencias).length > 0 && (
                <div className="bg-advertencia/10 border border-advertencia/30 rounded px-3 py-2 space-y-1">
                  <p className="text-xs font-semibold text-advertencia">⚠ Algunos campos están vacíos en la base de datos y se dejaron en blanco en el PDF:</p>
                  {Object.entries(advertencias).map(([nombre, campos]) => (
                    <p key={nombre} className="text-xs text-textoSec">
                      <span className="text-white">{nombre}</span>: {campos.join(", ")}
                    </p>
                  ))}
                  <p className="text-xs text-textoSec mt-1">Actualiza el perfil de cada persona en <span className="text-acento">/equipo</span>.</p>
                </div>
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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="shrink-0">Crew ({crewSelIds.size} seleccionados)</Label>
                  <Select
                    value={filtroDeptoGenerar}
                    onChange={(e) => setFiltroDeptoGenerar(e.target.value)}
                    className="flex-1 min-w-[160px] text-sm"
                  >
                    <option value="">Todos los departamentos</option>
                    {DEPARTAMENTOS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="text-xs text-acento hover:underline shrink-0"
                    onClick={() => {
                      const visibles = crew.filter(
                        (m) => !filtroDeptoGenerar || departamentoDeRol(m.role) === filtroDeptoGenerar
                      );
                      const todosSelec = visibles.every((m) => crewSelIds.has(m.id));
                      setCrewSelIds((prev) => {
                        const next = new Set(prev);
                        if (todosSelec) visibles.forEach((m) => next.delete(m.id));
                        else visibles.forEach((m) => next.add(m.id));
                        return next;
                      });
                    }}
                  >
                    {crew
                      .filter((m) => !filtroDeptoGenerar || departamentoDeRol(m.role) === filtroDeptoGenerar)
                      .every((m) => crewSelIds.has(m.id))
                      ? "Desmarcar todos"
                      : "Seleccionar todos"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto border border-borde rounded-md p-2">
                  {crew
                    .filter((m) => !filtroDeptoGenerar || departamentoDeRol(m.role) === filtroDeptoGenerar)
                    .map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                          crewSelIds.has(m.id)
                            ? "border-acento bg-acento/10 text-white"
                            : "border-borde hover:border-acento/50 text-textoSec hover:text-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={crewSelIds.has(m.id)}
                          onChange={() => toggleCrew(m.id)}
                          className="accent-acento w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-xs text-textoSec truncate">{m.role}</p>
                        </div>
                      </label>
                    ))}
                  {crew.filter((m) => !filtroDeptoGenerar || departamentoDeRol(m.role) === filtroDeptoGenerar).length === 0 && (
                    <p className="col-span-2 text-xs text-textoSec text-center py-3">Sin crew en este departamento.</p>
                  )}
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

      {/* — Lista de contratos como dashboard organizador — */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-[260px]">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-textoSec" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              className="pl-7 text-sm"
            />
          </div>
          <Select value={filtroDeptoLista} onChange={(e) => setFiltroDeptoLista(e.target.value)} className="max-w-[200px] text-sm">
            <option value="">Todos los departamentos</option>
            {DEPARTAMENTOS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="max-w-[160px] text-sm">
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="max-w-[180px] text-sm">
            <option value="">Todos los estados</option>
            <option value="firmado">Firmado</option>
            <option value="pendiente">Pendiente firma</option>
            <option value="faltan">Faltan campos</option>
            <option value="vencido">Vencido</option>
            <option value="borrador">Borrador</option>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => { setError(null); setUploadContratoOpen(true); }}
            >
              <Upload className="h-4 w-4 mr-1" /> Subir contrato
            </Button>
            <Button onClick={() => { setError(null); setEditandoContrato(VACIO_CONTRATO(projectId)); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo contrato
            </Button>
          </div>
        </div>
        {(busqueda || filtroDeptoLista || filtroTipo || filtroEstado) && (
          <p className="text-xs text-textoSec">
            Mostrando {filtrados.length} de {contracts.length} contratos.
          </p>
        )}
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
            const ev = estadoVisual(c);
            const depto = deptoDeContrato(c);
            const tieneArchivo = !!c.storage_path;
            const esGeneradoTexto = !!c.notes && !c.storage_path;
            return (
              <Card
                key={c.id}
                className={
                  ev === "faltan"
                    ? "border-error"
                    : vencido
                    ? "border-error"
                    : alerta
                    ? "border-advertencia"
                    : ev === "firmado"
                    ? "border-exito/50"
                    : ""
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">{c.type}</Badge>
                        <Badge variant="outline" className="text-xs">{depto}</Badge>
                        {c.origin === "uploaded" && (
                          <Badge variant="outline" className="text-[10px]">Subido</Badge>
                        )}
                        {c.origin === "template_docx" && (
                          <Badge variant="outline" className="text-[10px]">DOCX</Badge>
                        )}
                        {ev === "firmado" && (
                          <Badge variant="success" className="text-xs">FIRMADO</Badge>
                        )}
                        {ev === "pendiente" && (
                          <Badge variant="warning" className="text-xs">PENDIENTE FIRMA</Badge>
                        )}
                        {ev === "faltan" && (
                          <Badge variant="danger" className="text-xs">FALTAN CAMPOS</Badge>
                        )}
                        {ev === "vencido" && (
                          <Badge variant="danger" className="text-xs">VENCIDO</Badge>
                        )}
                        {ev === "borrador" && (
                          <Badge variant="default" className="text-xs">BORRADOR</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                      {esGeneradoTexto && (
                        <>
                          <button
                            title="Previsualizar PDF"
                            onClick={() => setPrevisualizando(c)}
                            className="text-textoSec hover:text-acento p-1"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Descargar PDF"
                            onClick={() => descargarPDF(c)}
                            className="text-textoSec hover:text-acento p-1"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            title="Enviar por email"
                            onClick={() => { setEmailMsg(null); setEnviando(c); }}
                            className="text-textoSec hover:text-acento p-1"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {tieneArchivo && (
                        <button
                          title="Descargar archivo"
                          onClick={() => descargarArchivoStorage(c)}
                          className="text-textoSec hover:text-acento p-1"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        title={ev === "firmado" ? "Marcar como pendiente" : "Marcar como firmado"}
                        onClick={() => toggleFirmado(c)}
                        className={`p-1 ${ev === "firmado" ? "text-exito" : "text-textoSec hover:text-exito"}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditandoContrato(c)} className="text-textoSec hover:text-acento p-1">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminarContratoUnificado(c)}
                        className="text-textoSec hover:text-error p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  {ev === "faltan" && (c.missing_fields?.length ?? 0) > 0 && (
                    <p className="text-xs text-error bg-error/10 border border-error/30 rounded px-2 py-1">
                      ⚠ Faltan: {c.missing_fields!.join(", ")}. Abre el archivo y completa los espacios marcados con <strong>RELLENAR:</strong>.
                    </p>
                  )}
                  {c.signed_at && (
                    <p className="text-xs">
                      <span className="text-textoSec">Firmado:</span> {c.signed_at.slice(0, 10)}
                    </p>
                  )}
                  {c.sign_date && !c.signed_at && (
                    <p><span className="text-textoSec">Firma:</span> {c.sign_date}</p>
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
                    <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-acento hover:underline text-xs">
                      <ExternalLink className="h-3 w-3" /> Ver enlace externo
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

      {/* Modal: previsualizar PDF */}
      {previsualizando && (
        <Dialog open onClose={() => setPrevisualizando(null)} className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">Previsualizar: {previsualizando.name}</DialogTitle>
          </DialogHeader>
          <div className="w-full" style={{ height: "600px" }}>
            {/* Import dinámico para evitar crash SSR */}
            <PDFViewerLazy contrato={previsualizando} proyecto={project?.name ?? "JERÓNIMO"} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrevisualizando(null)}>Cerrar</Button>
            <Button onClick={() => descargarPDF(previsualizando)}>
              <Download className="h-4 w-4 mr-1" /> Descargar
            </Button>
          </DialogFooter>
        </Dialog>
      )}

      {/* Modal: enviar por email */}
      {enviando && (
        <Dialog open onClose={() => { setEnviando(null); setEmailMsg(null); }}>
          <DialogHeader>
            <DialogTitle>Enviar por email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-textoSec truncate">{enviando.name}</p>
            {emailMsg && (
              <p className={`text-sm rounded px-3 py-2 ${emailMsg.startsWith("✓") ? "text-exito bg-exito/10 border border-exito/30" : "text-error bg-error/10 border border-error/30"}`}>
                {emailMsg}
              </p>
            )}
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => enviarEmail(enviando, "proyecto")}
                disabled={pendingEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                {pendingEmail ? "Enviando…" : `Enviar al correo del proyecto`}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => enviarEmail(enviando, "crew")}
                disabled={pendingEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                {pendingEmail ? "Enviando…" : "Enviar al correo del crew"}
              </Button>
            </div>
            <p className="text-xs text-textoSec">
              El correo del crew se obtiene de la base de datos. Si no está registrado, el envío fallará con un aviso.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEnviando(null); setEmailMsg(null); }}>Cerrar</Button>
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

      {/* Modal: Subir plantilla DOCX */}
      {uploadPlantillaOpen && (
        <UploadPlantillaModal
          projectId={projectId}
          onClose={() => setUploadPlantillaOpen(false)}
          onDone={() => { setUploadPlantillaOpen(false); router.refresh(); }}
        />
      )}

      {/* Modal: Subir contrato terminado */}
      {uploadContratoOpen && (
        <UploadContratoModal
          projectId={projectId}
          crew={crew}
          onClose={() => setUploadContratoOpen(false)}
          onDone={() => { setUploadContratoOpen(false); router.refresh(); }}
        />
      )}

      {/* Aviso legal */}
      <div className="border-t border-borde pt-4 mt-8">
        <p className="text-xs text-textoSec leading-relaxed">
          <span className="font-semibold text-advertencia">⚠ AVISO LEGAL:</span> Los contratos generados por P.A.I. son documentos de referencia administrativa elaborados con base en plantillas predefinidas. P.A.I. no es una firma de abogados ni presta servicios de asesoría jurídica. Estos documentos no reemplazan la revisión de un profesional del derecho. Las partes contratantes son responsables de verificar la validez y el cumplimiento del contrato conforme a la normatividad colombiana vigente (Código Civil, Código Sustantivo del Trabajo, Ley 23 de 1982 y demás leyes especiales aplicables). Los desarrolladores de P.A.I. no asumen responsabilidad por el contenido legal de los documentos generados.
        </p>
      </div>
    </div>
  );
}

// Modal para subir una plantilla .docx con placeholders {{nombre}}, {{cedula}}…
function UploadPlantillaModal({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Contract["type"]>("talento");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!file) { setError("Selecciona un archivo .docx"); return; }
    if (!nombre.trim()) { setError("Pon un nombre a la plantilla"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", nombre.trim());
    fd.append("type", tipo);
    fd.append("project_id", projectId);
    startTransition(async () => {
      const r = await subirPlantillaDOCX(fd);
      if (!r.ok) setError(r.error);
      else onDone();
    });
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Subir plantilla .docx</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-xs text-textoSec">
          Sube un archivo Word con marcadores como{" "}
          <code className="text-acento">{"{{nombre}}"}</code>,{" "}
          <code className="text-acento">{"{{cedula}}"}</code>,{" "}
          <code className="text-acento">{"{{tarifa_diaria}}"}</code>. Cuando un dato falte
          en el crew, el contrato dirá <strong>RELLENAR: CAMPO</strong> para que lo completes a mano.
        </p>
        <div>
          <Label>Nombre de la plantilla *</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Contrato talento JERÓNIMO 2026"
          />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as Contract["type"])}>
            {(["locacion", "talento", "equipo", "seguro", "otro"] as const).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Archivo .docx *</Label>
          <Input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-[10px] text-textoSec mt-1">Máx. 5 MB.</p>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Subiendo…" : "Subir plantilla"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Modal para subir un contrato ya terminado (firmado o no), en cualquier formato.
function UploadContratoModal({
  projectId,
  crew,
  onClose,
  onDone,
}: {
  projectId: string;
  crew: { id: string; name: string; role: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<Contract["type"]>("talento");
  const [crewId, setCrewId] = useState<string>("");
  const [yaFirmado, setYaFirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!file) { setError("Selecciona un archivo"); return; }
    if (!nombre.trim()) { setError("Pon un nombre al contrato"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", nombre.trim());
    fd.append("type", tipo);
    fd.append("project_id", projectId);
    if (crewId) fd.append("crew_member_id", crewId);
    if (yaFirmado) fd.append("signed", "true");
    startTransition(async () => {
      const r = await subirContratoTerminado(fd);
      if (!r.ok) setError(r.error);
      else onDone();
    });
  }

  return (
    <Dialog open onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Subir contrato terminado</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-xs text-textoSec">
          Sube un contrato ya hecho (firmado o no). Se guarda asociado al crew para
          mantener todo organizado en un solo lugar. Formatos: .docx, .pdf, .png, .jpg.
        </p>
        <div>
          <Label>Nombre del contrato *</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Contrato Ana Rangel — firmado"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as Contract["type"])}>
              {(["locacion", "talento", "equipo", "seguro", "otro"] as const).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Persona del crew (opcional)</Label>
            <Select value={crewId} onChange={(e) => setCrewId(e.target.value)}>
              <option value="">— Sin asignar —</option>
              {crew.map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>Archivo *</Label>
          <Input
            type="file"
            accept=".docx,.pdf,.png,.jpg,.jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-[10px] text-textoSec mt-1">Máx. 10 MB.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={yaFirmado}
            onChange={(e) => setYaFirmado(e.target.checked)}
            className="accent-acento w-4 h-4"
          />
          <span>Este contrato ya está firmado</span>
          <FileCheck2 className="h-4 w-4 text-textoSec" />
        </label>
        {error && <p className="text-sm text-error">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Subiendo…" : "Subir contrato"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Componente de preview: genera blob URL y lo muestra en un iframe
function PDFViewerLazy({ contrato, proyecto }: { contrato: Contract; proyecto: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  React.useEffect(() => {
    let url: string;
    import("@/components/contracts/ContractPDF").then(async (m) => {
      const blob = await import("@react-pdf/renderer").then(async ({ pdf }) => {
        const element = React.createElement(m.ContractPDFDoc, { contrato, proyecto });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return pdf(element as any).toBlob();
      });
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setCargando(false);
    });
    return () => { if (url) URL.revokeObjectURL(url); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contrato.id]);

  if (cargando) return <p className="text-textoSec text-sm p-4 text-center">Generando PDF…</p>;
  if (!blobUrl) return <p className="text-error text-sm p-4">Error al generar el PDF.</p>;

  return <iframe src={blobUrl} className="w-full h-full rounded border-0" title="Previsualización del contrato" />;
}
