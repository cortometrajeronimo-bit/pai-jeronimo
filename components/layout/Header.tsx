// Header sticky con info del proyecto activo
import { Film } from "lucide-react";

interface Props {
  projectName?: string;
  userEmail?: string | null;
}

export function Header({ projectName = "JERÓNIMO", userEmail }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-borde bg-fondo/80 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-acento" />
        <span className="text-sm font-medium">{projectName}</span>
        <span className="text-xs text-textoSec">· Tuluá · Junio 2026</span>
      </div>
      {userEmail && (
        <div className="text-xs text-textoSec">{userEmail}</div>
      )}
    </header>
  );
}
