"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  Users,
  CalendarClock,
  DollarSign,
  Camera,
  MessageSquare,
  Brain,
  Contact as ContactIcon,
  LogOut,
  LayoutDashboard,
  TrendingUp,
  FolderOpen,
  ClipboardList,
  BookText,
  FileSignature,
  Banknote,
  Bus,
  UtensilsCrossed,
  CheckSquare,
  AlertOctagon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Sidebar agrupado por secciones para no saturar visualmente
const secciones: { titulo: string; items: { href: string; label: string; icon: LucideIcon }[] }[] = [
  {
    titulo: "Resumen",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/proyecto", label: "Proyecto", icon: Film },
    ],
  },
  {
    titulo: "Equipo",
    items: [
      { href: "/crew", label: "Crew", icon: Users },
      { href: "/contactos", label: "Contactos", icon: ContactIcon },
      { href: "/attendance", label: "Asistencia", icon: CheckSquare },
      { href: "/payments", label: "Pagos Crew", icon: Banknote },
    ],
  },
  {
    titulo: "Producción",
    items: [
      { href: "/call-sheets", label: "Call Sheets", icon: CalendarClock },
      { href: "/daily-reports", label: "Daily Reports", icon: ClipboardList },
      { href: "/logbook", label: "Bitácora", icon: BookText },
      { href: "/contracts", label: "Contratos", icon: FileSignature },
      { href: "/incidents", label: "Incidentes", icon: AlertOctagon },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/presupuesto", label: "Presupuesto", icon: DollarSign },
      { href: "/cashflow", label: "Flujo de Caja", icon: TrendingUp },
    ],
  },
  {
    titulo: "Logística",
    items: [
      { href: "/equipos", label: "Equipos", icon: Camera },
      { href: "/transport", label: "Transporte", icon: Bus },
      { href: "/catering", label: "Catering", icon: UtensilsCrossed },
    ],
  },
  {
    titulo: "Recursos",
    items: [
      { href: "/drive", label: "Google Drive", icon: FolderOpen },
      { href: "/chat", label: "Chat IA", icon: MessageSquare },
      { href: "/memorias", label: "Memorias", icon: Brain },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-borde bg-superficie overflow-y-auto">
      <div className="px-6 py-6 border-b border-borde sticky top-0 bg-superficie z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-acento">P.A.I.</span>
          <span className="text-xs text-textoSec">JERÓNIMO</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-3">
        {secciones.map((sec) => (
          <div key={sec.titulo}>
            <p className="px-3 mb-1 text-[10px] uppercase tracking-wider text-textoTerc">
              {sec.titulo}
            </p>
            {sec.items.map(({ href, label, icon: Icon }) => {
              const activo = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                    activo
                      ? "bg-superficieAlt text-acento border-l-2 border-acento"
                      : "text-textoSec hover:bg-superficieAlt hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <form action="/auth/signout" method="post" className="p-3 border-t border-borde sticky bottom-0 bg-superficie">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-textoSec hover:bg-superficieAlt hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </aside>
  );
}
