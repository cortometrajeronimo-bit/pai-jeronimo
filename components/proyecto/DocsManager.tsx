"use client";

import { useState, useTransition } from "react";
import { Plus, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DocViewer, type DocumentoProyecto } from "./DocViewer";
import {
  anclarDocumento,
  desanclarDocumento,
  type Categoria,
} from "@/app/(dashboard)/proyecto/actions";

type DriveFile = { id: string; drive_file_id: string; name: string };

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: "guion", label: "Guion" },
  { value: "guion_tecnico", label: "Guion técnico" },
  { value: "cronograma", label: "Cronograma" },
  { value: "plan_rodaje", label: "Plan de rodaje" },
  { value: "otro", label: "Otro" },
];

export function DocsManager({
  documentos,
  driveFiles,
  projectId,
}: {
  documentos: DocumentoProyecto[];
  driveFiles: DriveFile[];
  projectId: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    drive_file_id: string;
    category: Categoria;
    title: string;
  }>({ drive_file_id: "", category: "guion", title: "" });

  function abrir() {
    setError(null);
    setForm({ drive_file_id: "", category: "guion", title: "" });
    setAbierto(true);
  }

  function guardar() {
    if (!form.drive_file_id) {
      setError("Selecciona un archivo de Drive.");
      return;
    }
    if (!form.title.trim()) {
      setError("Pon un título descriptivo.");
      return;
    }
    startTransition(async () => {
      const r = await anclarDocumento({
        project_id: projectId,
        drive_file_id: form.drive_file_id,
        category: form.category,
        title: form.title,
      });
      if (!r.ok) setError(r.error);
      else setAbierto(false);
    });
  }

  function desanclar(id: string) {
    if (!confirm("¿Quitar este documento del proyecto?")) return;
    startTransition(async () => {
      await desanclarDocumento(id);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-textoSec">
          {documentos.length} documento{documentos.length === 1 ? "" : "s"} anclado{documentos.length === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          {documentos.length > 0 && (
            <Select
              className="text-xs h-8"
              value=""
              onChange={(e) => {
                if (e.target.value) desanclar(e.target.value);
              }}
              disabled={pending}
            >
              <option value="">Desanclar...</option>
              {documentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          )}
          <Button size="sm" onClick={abrir}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Anclar documento
          </Button>
        </div>
      </div>

      <DocViewer documentos={documentos} />

      {abierto && (
        <Dialog open onClose={() => setAbierto(false)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="h-4 w-4" />
              Anclar documento al proyecto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Archivo de Drive</Label>
              <Select
                value={form.drive_file_id}
                onChange={(e) => {
                  const archivo = driveFiles.find(
                    (f) => f.drive_file_id === e.target.value
                  );
                  setForm({
                    ...form,
                    drive_file_id: e.target.value,
                    title: archivo?.name ?? form.title,
                  });
                }}
              >
                <option value="">— Selecciona —</option>
                {driveFiles.map((f) => (
                  <option key={f.id} value={f.drive_file_id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {driveFiles.length === 0 && (
                <p className="text-xs text-textoSec mt-1">
                  Importa archivos primero desde{" "}
                  <a href="/drive" className="text-acento hover:underline">
                    Drive
                  </a>
                  .
                </p>
              )}
            </div>

            <div>
              <Label>Categoría</Label>
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as Categoria })
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Guion v3 — final"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAbierto(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              {pending ? "Anclando…" : "Anclar"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

