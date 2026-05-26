"use client";

import { useState } from "react";
import { ExternalLink, FileText, Film, Calendar, ListChecks, Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Categoria = "guion" | "guion_tecnico" | "cronograma" | "plan_rodaje" | "otro";

export type DocumentoProyecto = {
  id: string;
  category: Categoria;
  title: string;
  drive_file_id: string;
};

const ETIQUETAS: Record<Categoria, { label: string; icon: typeof FileText }> = {
  guion: { label: "Guion", icon: FileText },
  guion_tecnico: { label: "Guion técnico", icon: Film },
  cronograma: { label: "Cronograma", icon: Calendar },
  plan_rodaje: { label: "Plan de rodaje", icon: ListChecks },
  otro: { label: "Otro", icon: Folder },
};

export function DocViewer({ documentos }: { documentos: DocumentoProyecto[] }) {
  const [seleccionado, setSeleccionado] = useState<DocumentoProyecto | null>(
    documentos[0] ?? null
  );

  if (documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-textoSec text-sm space-y-2">
          <p>No hay documentos anclados al proyecto todavía.</p>
          <p className="text-xs">
            Importa archivos desde <a href="/drive" className="text-acento hover:underline">Drive</a> y ánclalos al proyecto para verlos aquí.
          </p>
        </CardContent>
      </Card>
    );
  }

  const url = seleccionado
    ? `https://drive.google.com/file/d/${seleccionado.drive_file_id}/preview`
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Selector vertical */}
      <div className="space-y-1">
        {documentos.map((d) => {
          const meta = ETIQUETAS[d.category];
          const Icon = meta.icon;
          const activo = seleccionado?.id === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSeleccionado(d)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2 text-sm transition-colors border",
                activo
                  ? "bg-superficieAlt border-acento text-white"
                  : "bg-superficie border-borde text-textoSec hover:text-white hover:border-acento/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-acento shrink-0" />
                <Badge variant="outline" className="text-[10px]">
                  {meta.label}
                </Badge>
              </div>
              <p className="text-xs font-medium line-clamp-2">{d.title}</p>
            </button>
          );
        })}
      </div>

      {/* Viewer */}
      <div className="space-y-2">
        {seleccionado && (
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white truncate">
              {seleccionado.title}
            </h3>
            <a
              href={`https://drive.google.com/file/d/${seleccionado.drive_file_id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-acento hover:underline shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir en Drive
            </a>
          </div>
        )}
        {url && (
          <iframe
            key={url}
            src={url}
            className="w-full h-[70vh] min-h-[480px] rounded-md border border-borde bg-superficie"
            allow="autoplay"
            title={seleccionado?.title ?? "Documento"}
          />
        )}
      </div>
    </div>
  );
}
