"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Sparkles, ChevronUp } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { renderMarkdown } from "@/lib/markdown";

type Mensaje = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts?: string;
};

const PAGE_SIZE = 50;

// Convierte filas de la DB a burbujas (1 fila → 2 burbujas: user + assistant)
function filasABurbujas(filas: Conversation[]): Mensaje[] {
  const out: Mensaje[] = [];
  for (const f of filas) {
    if (f.user_message) {
      out.push({
        id: `${f.id}-u`,
        role: "user",
        content: f.user_message,
        ts: f.created_at,
      });
    }
    if (f.ai_response) {
      out.push({
        id: `${f.id}-a`,
        role: "assistant",
        content: f.ai_response,
        ts: f.created_at,
      });
    }
  }
  return out;
}

export function ChatClient({
  projectId,
  inicialesDB,
}: {
  projectId: string;
  inicialesDB: Conversation[];
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(filasABurbujas(inicialesDB));
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hayMas, setHayMas] = useState(inicialesDB.length >= PAGE_SIZE);
  const [cargandoMas, setCargandoMas] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes.length, cargando]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || cargando) return;

    setError(null);
    const tempId = `tmp-${Date.now()}`;
    const nuevoUser: Mensaje = {
      id: `${tempId}-u`,
      role: "user",
      content: texto,
    };
    setMensajes((m) => [...m, nuevoUser]);
    setInput("");
    setCargando(true);

    try {
      const historial = mensajes
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: texto,
          projectId,
          history: historial,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? "Error en el servidor");
      setMensajes((m) => [
        ...m,
        {
          id: `${tempId}-a`,
          role: "assistant",
          content: data.reply ?? "(respuesta vacía)",
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  const cargarMas = async () => {
    if (cargandoMas) return;
    setCargandoMas(true);
    try {
      const masAntiguo = mensajes.find((m) => m.ts)?.ts;
      const url = `/api/conversations?projectId=${projectId}&limit=${PAGE_SIZE}${
        masAntiguo ? `&before=${encodeURIComponent(masAntiguo)}` : ""
      }`;
      const r = await fetch(url);
      const data = await r.json();
      const items: Conversation[] = data?.items ?? [];
      if (items.length < PAGE_SIZE) setHayMas(false);
      setMensajes((m) => [...filasABurbujas(items), ...m]);
    } finally {
      setCargandoMas(false);
    }
  };

  const limpiar = async () => {
    if (!confirm("¿Borrar todo el historial de conversaciones?")) return;
    await fetch(`/api/conversations?projectId=${projectId}`, {
      method: "DELETE",
    });
    setMensajes([]);
    setHayMas(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] rounded-lg border border-borde bg-superficie overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-borde flex items-center justify-between bg-superficieAlt/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-acento" />
          <p className="text-sm font-medium">P.A.I. — JERÓNIMO</p>
        </div>
        {mensajes.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={limpiar}
            aria-label="Limpiar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Mensajes */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {hayMas && mensajes.length > 0 && (
          <div className="text-center">
            <Button
              size="sm"
              variant="outline"
              onClick={cargarMas}
              disabled={cargandoMas}
              className="gap-1 text-xs"
            >
              <ChevronUp className="h-3 w-3" />
              {cargandoMas ? "Cargando…" : "Cargar mensajes anteriores"}
            </Button>
          </div>
        )}

        {mensajes.length === 0 && !cargando && (
          <div className="text-center text-textoSec py-8 text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-acento/60" />
            <p>Inicia una conversación con P.A.I.</p>
            <p className="text-xs mt-1 text-textoTerc">
              Pregunta sobre logística, presupuesto, locaciones, crew…
            </p>
          </div>
        )}

        {mensajes.map((m) => (
          <BurbujaItem key={m.id} mensaje={m} />
        ))}

        {cargando && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-superficieAlt border border-borde px-3 py-2 text-sm">
              <span className="inline-flex gap-1">
                <Punto />
                <Punto delay="0.15s" />
                <Punto delay="0.3s" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Errores */}
      {error && (
        <div className="px-4 py-2 text-xs text-error bg-error/10 border-t border-error/20">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-borde p-3 bg-superficieAlt/30">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Pregúntale a P.A.I. (Enter envía · Shift+Enter nueva línea)"
            className="flex-1 resize-none rounded-md border border-borde bg-superficie px-3 py-2 text-sm text-white placeholder:text-textoSec focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento min-h-[40px] max-h-32"
            disabled={cargando}
          />
          <Button
            onClick={enviar}
            disabled={!input.trim() || cargando}
            className="gap-1"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function BurbujaItem({ mensaje }: { mensaje: Mensaje }) {
  const esUser = mensaje.role === "user";
  return (
    <div className={`flex ${esUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          esUser
            ? "bg-acento text-fondo"
            : "bg-superficieAlt border border-borde text-white"
        }`}
      >
        <div
          dangerouslySetInnerHTML={{ __html: renderMarkdown(mensaje.content) }}
        />
      </div>
    </div>
  );
}

function Punto({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-acento animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
