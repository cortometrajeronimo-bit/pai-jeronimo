"use client";

import { useEffect, useState, useTransition } from "react";
import {
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Folder,
  File as FileIcon,
  Trash2,
  ExternalLink,
  Download as ImportIcon,
  Search,
  AlertCircle,
  Upload,
  ShieldCheck,
  ArrowDownToLine,
} from "lucide-react";
import type { DriveFile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  sincronizarDrive,
  importarSheetACashFlow,
  eliminarDriveFile,
  exportarADrive,
  importarDesdeDrive,
} from "@/app/(dashboard)/drive/actions";
import type { ResultadoImportTotal } from "@/lib/drive-sync";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 min — TODO: cambiar por webhook (Drive Push Notifications)

function iconoPorMime(mime: string | null) {
  if (!mime) return FileIcon;
  if (mime.includes("folder")) return Folder;
  if (mime.includes("document")) return FileText;
  if (mime.includes("spreadsheet")) return FileSpreadsheet;
  return FileIcon;
}

function tipoLegible(mime: string | null): string {
  if (!mime) return "Archivo";
  if (mime.includes("folder")) return "Carpeta";
  if (mime.includes("document")) return "Google Doc";
  if (mime.includes("spreadsheet")) return "Google Sheet";
  if (mime.includes("pdf")) return "PDF";
  if (mime.startsWith("image/")) return "Imagen";
  return mime.split("/").pop() ?? "Archivo";
}

export function DriveClient({
  archivos,
  projectId,
  conectado,
}: {
  archivos: DriveFile[];
  projectId: string;
  conectado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [exportando, startExport] = useTransition();
  const [importando, startImport] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupUrl, setBackupUrl] = useState<string | null>(null);
  const [ultimoBackup, setUltimoBackup] = useState<string | null>(null);
  const [resultadoImport, setResultadoImport] = useState<ResultadoImportTotal | null>(null);

  // Polling cada 5 min — best-effort. TODO: usar webhook Drive Watch para tiempo real.
  useEffect(() => {
    if (!conectado) return;
    const id = setInterval(() => {
      sincronizarDrive(projectId).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [projectId, conectado]);

  function sincronizar() {
    setError(null);
    setMensaje(null);
    startTransition(async () => {
      const r = await sincronizarDrive(projectId);
      if (!r.ok) setError(r.error ?? "Error al sincronizar");
      else
        setMensaje(
          r.demo
            ? `Sincronizados ${r.importados} archivos en modo demo`
            : `Sincronizados ${r.importados} de ${r.total} archivos`
        );
    });
  }

  function exportar() {
    setError(null);
    setMensaje(null);
    startExport(async () => {
      const r = await exportarADrive(projectId);
      if (!r.ok) {
        setError(r.error ?? "Error al exportar a Drive");
      } else {
        setMensaje("Backup creado/actualizado en Drive correctamente");
        if (r.sheetUrl) setBackupUrl(r.sheetUrl);
        if (r.timestamp) setUltimoBackup(new Date(r.timestamp).toLocaleString("es-CO"));
      }
    });
  }

  function importarDesdeBackup() {
    setError(null);
    setMensaje(null);
    setResultadoImport(null);
    if (!confirm("¿Importar los datos del backup de Drive hacia PAI?\n\nFilas con ID existente → actualizan el registro.\nFilas sin ID → se crean como nuevos registros.")) return;
    startImport(async () => {
      const r = await importarDesdeDrive(projectId);
      if (!r.ok) {
        setError(r.error ?? "Error al importar desde Drive");
      } else {
        setResultadoImport(r);
        const total =
          (r.crew?.nuevos ?? 0) + (r.crew?.actualizados ?? 0) +
          (r.gastos?.nuevos ?? 0) + (r.gastos?.actualizados ?? 0) +
          (r.equipos?.nuevos ?? 0) + (r.equipos?.actualizados ?? 0) +
          (r.cashflow?.nuevos ?? 0) + (r.cashflow?.actualizados ?? 0);
        setMensaje(`Drive → PAI completado: ${total} registros procesados`);
      }
    });
  }

  function importar(driveFileId: string) {
    setError(null);
    setMensaje(null);
    if (!confirm("¿Importar las filas de este Sheet a Flujo de Caja?")) return;
    startTransition(async () => {
      const r = await importarSheetACashFlow(projectId, driveFileId);
      if (!r.ok) setError(r.error ?? "Error al importar");
      else setMensaje(`Importadas ${r.importados} filas a Flujo de Caja`);
    });
  }

  function borrar(id: string) {
    if (!confirm("¿Quitar este archivo del listado local?")) return;
    startTransition(async () => {
      await eliminarDriveFile(id);
    });
  }

  const filtrados = archivos.filter((a) =>
    a.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {!conectado && (
        <Card className="border-advertencia">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-advertencia mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Modo demo activo</p>
              <p className="text-textoSec mt-1">
                Para conectar Drive real configura en <code className="bg-superficieAlt px-1 rounded">.env.local</code>:{" "}
                <code className="text-acento">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
                <code className="text-acento">GOOGLE_SERVICE_ACCOUNT_KEY</code>,{" "}
                <code className="text-acento">GOOGLE_DRIVE_ROOT_FOLDER_ID</code>. Comparte la
                carpeta con el email del service account (lector).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de backup */}
      {conectado && (
        <Card className="border-acento/30 bg-acento/5">
          <CardContent className="pt-4 flex flex-wrap items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-acento flex-shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-acento">Backup automático activo</p>
              <p className="text-textoSec text-xs mt-0.5">
                Cada cambio en Crew, Presupuesto, Equipos o Cash Flow se guarda automáticamente en Drive.
                {ultimoBackup && ` Último backup manual: ${ultimoBackup}.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {backupUrl && (
                <a href={backupUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3 mr-1" /> Ver backup
                  </Button>
                </a>
              )}
              <Button onClick={exportar} disabled={exportando || importando} size="sm" variant="outline">
                <Upload className={`h-3 w-3 mr-1 ${exportando ? "animate-spin" : ""}`} />
                {exportando ? "Exportando..." : "PAI → Drive"}
              </Button>
              <Button onClick={importarDesdeBackup} disabled={exportando || importando} size="sm">
                <ArrowDownToLine className={`h-3 w-3 mr-1 ${importando ? "animate-spin" : ""}`} />
                {importando ? "Importando..." : "Drive → PAI"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textoSec" />
          <Input
            placeholder="Buscar archivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={sincronizar} disabled={pending}>
          <RefreshCw className={`h-4 w-4 mr-1 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Sincronizando..." : "Sincronizar Drive"}
        </Button>
      </div>

      {mensaje && (
        <div className="rounded border border-exito bg-exito/10 px-3 py-2 text-sm text-exito">
          {mensaje}
        </div>
      )}
      {error && (
        <div className="rounded border border-error bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      {/* Detalle de la última importación Drive → PAI */}
      {resultadoImport?.ok && (
        <div className="rounded border border-borde bg-superficieAlt p-3 text-xs space-y-1">
          <p className="font-semibold text-texto mb-2">Resultado Drive → PAI</p>
          {(["crew", "gastos", "equipos", "cashflow"] as const).map((tabla) => {
            const r = resultadoImport[tabla];
            if (!r) return null;
            const labels: Record<string, string> = { crew: "Crew", gastos: "Presupuesto", equipos: "Equipos", cashflow: "Cash Flow" };
            return (
              <div key={tabla} className="flex items-center gap-4 text-textoSec">
                <span className="w-24 font-medium text-texto">{labels[tabla]}</span>
                <span className="text-exito">+{r.nuevos} nuevos</span>
                <span className="text-acento">↻ {r.actualizados} actualizados</span>
                {r.errores > 0 && <span className="text-error">⚠ {r.errores} errores</span>}
              </div>
            );
          })}
        </div>
      )}

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-textoSec">
            {archivos.length === 0
              ? "No hay archivos sincronizados aún. Pulsa 'Sincronizar' para importar la lista de Drive."
              : "Sin resultados para esa búsqueda."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((a) => {
            const Icon = iconoPorMime(a.mime_type);
            const esSheet = a.mime_type?.includes("spreadsheet");
            return (
              <Card key={a.id} className="hover:border-acento transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Icon className="h-6 w-6 text-acento flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm break-words">{a.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {tipoLegible(a.mime_type)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <p className="text-xs text-textoSec">
                    Sincronizado:{" "}
                    {new Date(a.last_synced_at).toLocaleString("es-CO")}
                  </p>
                  {a.content_text && (
                    <p className="text-xs text-textoSec line-clamp-2">
                      {a.content_text.slice(0, 120)}...
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    {a.web_view_link && a.web_view_link !== "#" && (
                      <a
                        href={a.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-acento hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </a>
                    )}
                    {esSheet && (
                      <button
                        onClick={() => importar(a.drive_file_id)}
                        className="text-xs flex items-center gap-1 text-acento hover:underline"
                        disabled={pending}
                      >
                        <ImportIcon className="h-3 w-3" />
                        Importar a Cash Flow
                      </button>
                    )}
                    <button
                      onClick={() => borrar(a.id)}
                      className="text-xs flex items-center gap-1 text-textoSec hover:text-error ml-auto"
                      disabled={pending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
