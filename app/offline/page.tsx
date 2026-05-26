"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const [reconectado, setReconectado] = useState(false);

  useEffect(() => {
    const onOnline = () => setReconectado(true);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return (
    <div className="min-h-screen bg-fondo flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-superficie p-5 border border-borde">
            <WifiOff className="h-10 w-10 text-acento" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Sin conexión</h1>
          <p className="text-sm text-textoSec">
            No hay internet ahora mismo. Puedes seguir consultando los datos
            cacheados localmente y registrar cambios — se sincronizarán cuando
            vuelvas a conectarte.
          </p>
        </div>

        {reconectado && (
          <div className="rounded-md border border-exito/50 bg-exito/10 px-4 py-3 text-sm text-exito">
            ✓ Conexión restablecida. Recarga para sincronizar.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-acento px-4 py-2 text-sm font-semibold text-fondo hover:bg-acento/90"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/proyecto"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-borde px-4 py-2 text-sm text-white hover:bg-superficie"
          >
            Ir al proyecto
          </Link>
        </div>
      </div>
    </div>
  );
}
