"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Film,
  Users,
  CalendarClock,
  DollarSign,
  Camera,
  MessageSquare,
  LogOut,
  TrendingUp,
  FolderOpen,
  ClipboardList,
  BookText,
  FileSignature,
  Banknote,
  Bus,
  UtensilsCrossed,
  AlertOctagon,
  ClapperboardIcon,
  Briefcase,
  Truck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Nueva navegación: 9 grupos primarios. Grupos con varios hijos se expanden
// como acordeón (auto-expandido cuando alguno de sus hijos está activo).
type ItemSimple = { href: string; label: string; icon: LucideIcon };
type Grupo = {
  key: string;
  label: string;
  icon: LucideIcon;
  // Si tiene href propio (sin hijos), es link directo.
  href?: string;
  // Si tiene hijos, se muestra como acordeón.
  hijos?: ItemSimple[];
};

const GRUPOS: Grupo[] = [
  { key: "proyecto", label: "Proyecto", icon: Film, href: "/proyecto" },
  {
    key: "equipo",
    label: "Equipo",
    icon: Briefcase,
    hijos: [
      { href: "/crew", label: "Crew", icon: Users },
      { href: "/payments", label: "Pagos", icon: Banknote },
    ],
  },
  {
    key: "produccion",
    label: "Producción",
    icon: ClapperboardIcon,
    hijos: [
      { href: "/call-sheets", label: "Call Sheets", icon: CalendarClock },
      { href: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
      { href: "/logbook", label: "Bitácora", icon: BookText },
      { href: "/incidents", label: "Incidentes", icon: AlertOctagon },
    ],
  },
  { key: "contratos", label: "Contratos", icon: FileSignature, href: "/contracts" },
  { key: "presupuesto", label: "Presupuesto", icon: DollarSign, href: "/presupuesto" },
  { key: "cashflow", label: "Flujo de Caja", icon: TrendingUp, href: "/cashflow" },
  {
    key: "logistica",
    label: "Logística",
    icon: Truck,
    hijos: [
      { href: "/equipos", label: "Equipos", icon: Camera },
      { href: "/transport", label: "Transporte", icon: Bus },
      { href: "/catering", label: "Catering", icon: UtensilsCrossed },
    ],
  },
  { key: "drive", label: "Drive", icon: FolderOpen, href: "/drive" },
  {
    key: "pai",
    label: "P.A.I.",
    icon: Sparkles,
    hijos: [
      { href: "/chat", label: "Chat IA", icon: MessageSquare },
      { href: "/memorias", label: "Memorias", icon: BookText },
    ],
  },
];

function grupoActivo(grupo: Grupo, pathname: string | null): boolean {
  if (!pathname) return false;
  if (grupo.href && pathname.startsWith(grupo.href)) return true;
  if (grupo.hijos?.some((h) => pathname.startsWith(h.href))) return true;
  return false;
}

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: Props) {
  const pathname = usePathname();
  // Grupos expandidos manualmente por el usuario. El grupo activo siempre se considera abierto.
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      <div className="px-6 py-6 border-b border-borde sticky top-0 bg-superficie z-10">
        <Link
          href="/proyecto"
          onClick={onLinkClick}
          className="flex items-center gap-2"
        >
          <span className="text-2xl font-bold tracking-tight text-acento">
            P.A.I.
          </span>
          <span className="text-xs text-textoSec">JERÓNIMO</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {GRUPOS.map((g) => {
          const activo = grupoActivo(g, pathname);
          const Icon = g.icon;

          // Link directo (sin hijos)
          if (g.href) {
            return (
              <Link
                key={g.key}
                href={g.href}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  activo
                    ? "bg-superficieAlt text-acento border-l-2 border-acento"
                    : "text-textoSec hover:bg-superficieAlt hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {g.label}
              </Link>
            );
          }

          // Grupo con hijos (acordeón)
          const abierto = expandidos.has(g.key) || activo;
          return (
            <div key={g.key}>
              <button
                type="button"
                onClick={() => toggle(g.key)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  activo
                    ? "text-acento"
                    : "text-textoSec hover:bg-superficieAlt hover:text-white"
                )}
                aria-expanded={abierto}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    abierto && "rotate-180"
                  )}
                />
              </button>
              {abierto && g.hijos && (
                <div className="ml-3 mt-0.5 mb-1 border-l border-borde">
                  {g.hijos.map(({ href, label, icon: HijoIcon }) => {
                    const hijoActivo = pathname?.startsWith(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={onLinkClick}
                        className={cn(
                          "flex items-center gap-2 pl-4 pr-3 py-1.5 text-xs transition-colors",
                          hijoActivo
                            ? "text-acento font-semibold"
                            : "text-textoSec hover:text-white"
                        )}
                      >
                        <HijoIcon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <form
        action="/auth/signout"
        method="post"
        className="p-3 border-t border-borde sticky bottom-0 bg-superficie"
      >
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-textoSec hover:bg-superficieAlt hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-60 flex-col border-r border-borde bg-superficie overflow-y-auto">
        <SidebarContent />
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-superficie border-r border-borde transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onLinkClick={onClose} />
      </aside>
    </>
  );
}
