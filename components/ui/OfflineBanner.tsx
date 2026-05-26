"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineBanner() {
  const { isOnline, syncPending, lastSync } = useOfflineSync();

  if (isOnline && syncPending === 0) return null;

  if (!isOnline) {
    return (
      <div className="sticky top-14 z-20 flex items-center gap-2 px-4 py-2 bg-advertencia/15 border-b border-advertencia/40 text-advertencia text-xs">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        <span>Sin conexión — los cambios se sincronizarán cuando vuelva la red.</span>
        {syncPending > 0 && (
          <span className="ml-auto shrink-0 font-medium">{syncPending} pendiente{syncPending > 1 ? "s" : ""}</span>
        )}
      </div>
    );
  }

  // Online pero aún sincronizando
  if (syncPending > 0) {
    return (
      <div className="sticky top-14 z-20 flex items-center gap-2 px-4 py-2 bg-exito/10 border-b border-exito/40 text-exito text-xs">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
        <span>Sincronizando {syncPending} cambio{syncPending > 1 ? "s" : ""} con el servidor…</span>
      </div>
    );
  }

  // Recién sincronizado (lastSync en los últimos 5s)
  if (lastSync && Date.now() - lastSync.getTime() < 5000) {
    return (
      <div className="sticky top-14 z-20 flex items-center gap-2 px-4 py-2 bg-exito/10 border-b border-exito/30 text-exito text-xs">
        <span>✓ Datos sincronizados correctamente.</span>
      </div>
    );
  }

  return null;
}
