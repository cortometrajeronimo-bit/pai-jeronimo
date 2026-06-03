"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Link as LinkIcon, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { crearCalendarioProyecto, actualizarConfiguracionCalendario } from "@/app/(dashboard)/proyecto/actions";

export function CalendarSync({
  projectId,
  googleCalendarId,
  googleCalendarLink,
  syncTransports: initialSyncTransports,
  syncCallSheets: initialSyncCallSheets,
}: {
  projectId: string;
  googleCalendarId: string | null;
  googleCalendarLink: string | null;
  syncTransports: boolean;
  syncCallSheets: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [syncTransports, setSyncTransports] = useState(initialSyncTransports);
  const [syncCallSheets, setSyncCallSheets] = useState(initialSyncCallSheets);
  const router = useRouter();

  function iniciarCreacion() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await crearCalendarioProyecto(projectId);
        if (!res.ok) {
          setError(res.error || "No se pudo crear el calendario.");
        } else {
          router.refresh();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error inesperado.";
        setError(errorMsg);
      }
    });
  }

  function cambiarPreferencia(tipo: "transports" | "call_sheets", checked: boolean) {
    setError(null);
    const prevTransports = syncTransports;
    const prevCallSheets = syncCallSheets;

    if (tipo === "transports") {
      setSyncTransports(checked);
    } else {
      setSyncCallSheets(checked);
    }

    startTransition(async () => {
      try {
        const res = await actualizarConfiguracionCalendario(projectId, {
          sync_transports: tipo === "transports" ? checked : prevTransports,
          sync_call_sheets: tipo === "call_sheets" ? checked : prevCallSheets,
        });

        if (!res.ok) {
          setError(res.error || "No se pudo guardar la preferencia.");
          if (tipo === "transports") setSyncTransports(prevTransports);
          else setSyncCallSheets(prevCallSheets);
        } else {
          router.refresh();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error de red.";
        setError(errorMsg);
        if (tipo === "transports") setSyncTransports(prevTransports);
        else setSyncCallSheets(prevCallSheets);
      }
    });
  }

  const embedUrl = googleCalendarId
    ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleCalendarId)}&ctz=America%2FBogota&mode=AGENDA&wkst=2&bgcolor=%230a0a0a`
    : "";

  // Si ya tiene el calendario creado
  if (googleCalendarId && googleCalendarLink) {
    return (
      <Card className="border-acento/20 bg-superficieAlt/40">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-acento animate-pulse" />
                Calendario de Rodaje Compartido
              </CardTitle>
              <CardDescription className="text-xs text-textoSec mt-1">
                Sincronizado automáticamente en la nube de Google
              </CardDescription>
            </div>
            <BadgeListo />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-textoSec leading-relaxed">
            Hemos generado un calendario público para el rodaje de <strong>JERÓNIMO</strong>.
            Cualquier miembro del equipo técnico o artístico puede agregarlo a su Google Calendar personal con el siguiente botón, sin necesidad de tener cuenta en esta aplicación.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => window.open(googleCalendarLink, "_blank")}
              className="bg-acento text-black hover:bg-acento/90 font-bold"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Suscribirse al Calendario
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open(`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(googleCalendarId)}&ctz=America/Bogota`, "_blank")}
              className="border-borde hover:border-acento/50 text-textoSec hover:text-white"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Ver en Navegador
            </Button>
          </div>

          {/* Toggles de Sincronización Selectiva */}
          <div className="border-t border-borde/40 pt-4 mt-2 space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Configuración de Sincronización Selectiva
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-borde bg-superficieAlt/20 cursor-pointer hover:bg-superficieAlt/40 transition-colors">
                <input
                  type="checkbox"
                  disabled={pending}
                  checked={syncCallSheets}
                  onChange={(e) => cambiarPreferencia("call_sheets", e.target.checked)}
                  className="rounded border-borde bg-superficie text-acento focus:ring-acento/50 h-4 w-4 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-white">Sincronizar Llamados</p>
                  <p className="text-xs text-textoSec">Eventos de Call Sheets</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-borde bg-superficieAlt/20 cursor-pointer hover:bg-superficieAlt/40 transition-colors">
                <input
                  type="checkbox"
                  disabled={pending}
                  checked={syncTransports}
                  onChange={(e) => cambiarPreferencia("transports", e.target.checked)}
                  className="rounded border-borde bg-superficie text-acento focus:ring-acento/50 h-4 w-4 mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-white">Sincronizar Transportes</p>
                  <p className="text-xs text-textoSec">Eventos de vehículos y rutas</p>
                </div>
              </label>
            </div>
            {pending && (
              <p className="text-xs text-acento flex items-center gap-1.5 animate-pulse mt-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Guardando preferencias y sincronizando eventos...
              </p>
            )}
          </div>

          {error && (
            <div className="flex flex-col gap-2 text-xs text-error bg-error/10 border border-error/20 p-3 rounded mt-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {error.includes("Google Calendar API has not been used") && (
                <div className="pt-1">
                  <Button
                    onClick={() => window.open("https://console.developers.google.com/apis/library/calendar.googleapis.com?project=265049982046", "_blank")}
                    size="sm"
                    className="bg-error text-white hover:bg-error/90 font-bold text-xs"
                  >
                    Activar API en Google Console
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-borde/60 bg-superficie overflow-hidden mt-3 h-[250px]">
            <iframe
              src={embedUrl}
              style={{ border: 0 }}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              className="opacity-90 filter invert hue-rotate-180 brightness-95"
            ></iframe>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado si no está creado
  return (
    <Card className="border-borde/60 bg-superficie/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-5 w-5 text-textoSec" />
          Calendario de Rodaje (Google Calendar)
        </CardTitle>
        <CardDescription className="text-xs">
          Crea un calendario de Google público para que todo el crew acceda al cronograma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-textoSec">
          Sincroniza los llamados oficiales (Call Sheets) y las salidas de los transportes. Al activarlo, obtendrás un enlace público de Google para compartir en el grupo de rodaje de WhatsApp.
        </p>

        {error && (
          <div className="flex flex-col gap-2 text-xs text-error bg-error/10 border border-error/20 p-3 rounded mt-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {error.includes("Google Calendar API has not been used") && (
              <div className="pt-1">
                <Button
                  onClick={() => window.open("https://console.developers.google.com/apis/library/calendar.googleapis.com?project=265049982046", "_blank")}
                  size="sm"
                  className="bg-error text-white hover:bg-error/90 font-bold text-xs"
                >
                  Activar API en Google Console
                </Button>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={iniciarCreacion}
          disabled={pending}
          className="bg-superficieAlt border border-borde hover:border-acento/50 text-white gap-2 font-medium"
        >
          {pending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-acento" />
              Creando y sincronizando eventos...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 text-acento" />
              Generar Calendario de Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function BadgeListo() {
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-exito bg-exito/10 border border-exito/20 px-2 py-0.5 rounded-full">
      <Check className="h-3 w-3" /> Activo
    </div>
  );
}
