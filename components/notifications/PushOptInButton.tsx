"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

type Estado = "init" | "no-soporta" | "permitido" | "denegado" | "default" | "suscrito";

// Convierte la public key base64-url a Uint8Array que requiere pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushOptInButton() {
  const [estado, setEstado] = useState<Estado>("init");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado("no-soporta");
      return;
    }
    (async () => {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setEstado("suscrito");
      } else {
        const perm = Notification.permission;
        setEstado(perm === "granted" ? "permitido" : perm === "denied" ? "denegado" : "default");
      }
    })();
  }, []);

  async function activar() {
    setMensaje(null);
    if (!publicKey) {
      setMensaje("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el entorno");
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setEstado("denegado");
        setMensaje("Permiso denegado. Actívalo desde Ajustes del iPhone → Notificaciones.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      // BufferSource cast: TS expone Uint8Array<ArrayBufferLike> que no
      // satisface ArrayBufferView<ArrayBuffer>; en runtime es válido.
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "no se pudo guardar");
      setEstado("suscrito");
      setMensaje("✅ Listo. Te avisaremos cuando una urgencia quede sin cerrar.");
    } catch (e) {
      setMensaje((e as Error).message);
    }
  }

  async function desactivar() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado("default");
      setMensaje("Notificaciones desactivadas en este dispositivo.");
    } catch (e) {
      setMensaje((e as Error).message);
    }
  }

  if (estado === "init") return null;

  if (estado === "no-soporta") {
    return (
      <p className="text-xs text-textoSec flex items-center gap-2">
        <BellOff className="h-3.5 w-3.5" />
        Notificaciones no soportadas en este navegador. En iPhone usa la PWA
        instalada en pantalla de inicio.
      </p>
    );
  }

  if (estado === "suscrito") {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="sm" onClick={desactivar} className="gap-2">
          <BellRing className="h-3.5 w-3.5 text-acento" />
          Alertas activas en este iPhone
        </Button>
        {mensaje && <p className="text-[11px] text-textoSec">{mensaje}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" onClick={activar} className="gap-2">
        <Bell className="h-3.5 w-3.5" />
        Activar alertas en este iPhone
      </Button>
      {mensaje && <p className="text-[11px] text-textoSec">{mensaje}</p>}
      <p className="text-[10px] text-textoTerc">
        Requiere PWA instalada en pantalla de inicio (iOS 16.4+).
      </p>
    </div>
  );
}
