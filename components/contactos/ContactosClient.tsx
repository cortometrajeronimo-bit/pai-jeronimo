"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Search,
  Plus,
  Star,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Tag as TagIcon,
} from "lucide-react";
import type { Contact } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  guardarContacto,
  eliminarContacto,
  alternarFavorito,
} from "@/app/(dashboard)/contactos/actions";

type Props = {
  contactos: Contact[];
  projectId: string;
};

const TIPOS = ["proveedor", "locacion", "institucion", "talento", "otro"] as const;

// Paleta de colores asignados de forma estable a partir del nombre del tag
const PALETA = [
  "bg-acento/15 text-acento border-acento/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-sky-500/15 text-sky-400 border-sky-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
];

function colorTag(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

const VACIO = (projectId: string): Contact => ({
  id: "",
  project_id: projectId,
  name: "",
  company: null,
  type: "proveedor",
  email: null,
  phone: null,
  address: null,
  notes: null,
  is_favorite: false,
  tags: [],
});

export function ContactosClient({ contactos, projectId }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [editando, setEditando] = useState<Contact | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return contactos.filter((c) => {
      if (filtroTipo && c.type !== filtroTipo) return false;
      if (soloFavoritos && !c.is_favorite) return false;
      if (!q) return true;
      const tagStr = (c.tags ?? []).join(" ").toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        tagStr.includes(q)
      );
    });
  }, [contactos, busqueda, filtroTipo, soloFavoritos]);

  const onGuardar = (c: Contact) => {
    setError(null);
    startTransition(async () => {
      const { id, ...rest } = c;
      const res = await guardarContacto({
        ...(id ? { id } : {}),
        ...rest,
        tags: rest.tags ?? [],
      });
      if (!res.ok) setError(res.error ?? "Error desconocido");
      else setEditando(null);
    });
  };

  const onEliminar = (id: string) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    startTransition(async () => {
      const res = await eliminarContacto(id);
      if (!res.ok) setError(res.error ?? "Error eliminando");
      else setEditando(null);
    });
  };

  const toggleFav = (c: Contact) => {
    startTransition(async () => {
      await alternarFavorito(c.id, !c.is_favorite);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-textoSec" />
          <Input
            placeholder="Buscar por nombre, empresa, tag, teléfono…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="md:w-44"
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button
          variant={soloFavoritos ? "default" : "outline"}
          onClick={() => setSoloFavoritos((v) => !v)}
          className="gap-2"
        >
          <Star
            className={`h-4 w-4 ${soloFavoritos ? "fill-fondo" : ""}`}
          />
          Favoritos
        </Button>
        <Button
          onClick={() => {
            setError(null);
            setEditando(VACIO(projectId));
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      {filtrados.length === 0 ? (
        <Card className="p-8 text-center text-textoSec">Sin contactos.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <Card key={c.id} className="p-4 hover:border-acento/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-textoSec">
                    {c.type ?? "—"}
                    {c.company ? ` · ${c.company}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => toggleFav(c)}
                  disabled={pending}
                  aria-label="Marcar favorito"
                  className="text-textoSec hover:text-acento"
                >
                  <Star
                    className={`h-4 w-4 ${
                      c.is_favorite ? "fill-acento text-acento" : ""
                    }`}
                  />
                </button>
              </div>
              <div className="mt-3 space-y-1 text-xs text-textoSec">
                {c.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> {c.phone}
                  </p>
                )}
                {c.email && (
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="h-4 w-4" /> {c.email}
                  </p>
                )}
                {c.address && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {c.address}
                  </p>
                )}
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border ${colorTag(
                        t
                      )}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {c.notes && (
                <p className="text-xs text-textoSec mt-3 line-clamp-2">{c.notes}</p>
              )}
              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-borde">
                <Button size="sm" variant="ghost" onClick={() => setEditando(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEliminar(c.id)}
                  disabled={pending}
                >
                  <Trash2 className="h-4 w-4 text-error" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!editando}
        onClose={() => {
          setEditando(null);
          setError(null);
        }}
        className="max-w-xl"
      >
        {editando && (
          <ContactoForm
            inicial={editando}
            onCambio={setEditando}
            onGuardar={onGuardar}
            onCancelar={() => {
              setEditando(null);
              setError(null);
            }}
            pending={pending}
            error={error}
          />
        )}
      </Dialog>
    </div>
  );
}

function ContactoForm({
  inicial,
  onCambio,
  onGuardar,
  onCancelar,
  pending,
  error,
}: {
  inicial: Contact;
  onCambio: (c: Contact) => void;
  onGuardar: (c: Contact) => void;
  onCancelar: () => void;
  pending: boolean;
  error: string | null;
}) {
  const [nuevoTag, setNuevoTag] = useState("");
  const set = (k: keyof Contact, v: unknown) => onCambio({ ...inicial, [k]: v });

  const agregarTag = () => {
    const t = nuevoTag.trim().toLowerCase();
    if (!t) return;
    const tags = inicial.tags ?? [];
    if (tags.includes(t)) return;
    set("tags", [...tags, t]);
    setNuevoTag("");
  };

  const quitarTag = (t: string) =>
    set("tags", (inicial.tags ?? []).filter((x) => x !== t));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{inicial.id ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar(inicial);
        }}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Nombre *</Label>
          <Input
            required
            value={inicial.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Tipo</Label>
          <Select
            value={inicial.type ?? ""}
            onChange={(e) => set("type", e.target.value || null)}
            className="mt-1"
          >
            <option value="">—</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label className="text-xs text-textoSec">Empresa</Label>
          <Input
            value={inicial.company ?? ""}
            onChange={(e) => set("company", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Teléfono</Label>
          <Input
            value={inicial.phone ?? ""}
            onChange={(e) => set("phone", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-textoSec">Email</Label>
          <Input
            type="email"
            value={inicial.email ?? ""}
            onChange={(e) => set("email", e.target.value || null)}
            className="mt-1"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Dirección</Label>
          <Input
            value={inicial.address ?? ""}
            onChange={(e) => set("address", e.target.value || null)}
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec flex items-center gap-1">
            <TagIcon className="h-4 w-4" /> Tags
          </Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="ej. catering, urgente"
              value={nuevoTag}
              onChange={(e) => setNuevoTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={agregarTag}>
              Agregar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {(inicial.tags ?? []).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-superficieAlt border border-borde px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => quitarTag(t)}
                  className="text-textoSec hover:text-error"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs text-textoSec">Notas</Label>
          <Textarea
            value={inicial.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            className="mt-1"
          />
        </div>

        <label className="flex items-center gap-2 md:col-span-2 text-sm">
          <input
            type="checkbox"
            checked={inicial.is_favorite}
            onChange={(e) => set("is_favorite", e.target.checked)}
            className="accent-acento"
          />
          Favorito
        </label>

        {error && <p className="md:col-span-2 text-sm text-error">{error}</p>}

        <DialogFooter className="md:col-span-2">
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

