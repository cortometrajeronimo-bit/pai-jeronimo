"use client";

import { Film, Menu } from "lucide-react";

interface Props {
  projectName?: string;
  userEmail?: string | null;
  onMenuClick?: () => void;
}

export function Header({ projectName = "JERÓNIMO", userEmail, onMenuClick }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borde bg-fondo/80 px-4 md:px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="md:hidden mr-1 p-1.5 rounded-md text-textoSec hover:bg-superficieAlt hover:text-white transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Film className="h-4 w-4 text-acento" />
        <span className="text-sm font-medium">{projectName}</span>
        <span className="hidden sm:inline text-xs text-textoSec">· Tuluá · Junio 2026</span>
      </div>
      {userEmail && (
        <div className="text-xs text-textoSec truncate max-w-[140px] sm:max-w-none">{userEmail}</div>
      )}
    </header>
  );
}
