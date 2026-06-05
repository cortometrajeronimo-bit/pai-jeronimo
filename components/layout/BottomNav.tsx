"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  ClipboardList,
  TrendingUp,
  FileSignature,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom nav móvil — 5 accesos críticos del día a día
const NAV_ITEMS = [
  { href: "/proyecto", label: "Proyecto", icon: Film },
  { href: "/daily-reports", label: "Producción", icon: ClipboardList },
  { href: "/cashflow", label: "Caja", icon: TrendingUp },
  { href: "/contracts", label: "Contratos", icon: FileSignature },
  { href: "/chat", label: "P.A.I.", icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                activo ? "text-acento" : "text-textoTerc hover:text-textoSec"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  activo && "drop-shadow-[0_0_6px_#d4af37]"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
