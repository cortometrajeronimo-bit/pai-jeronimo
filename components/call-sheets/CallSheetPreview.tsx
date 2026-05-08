"use client";

import type { CrewMember } from "@/lib/types";
import { departamentoDeRol } from "@/lib/departamentos";
import { formatDate } from "@/lib/utils";

// Vista previa en HTML que replica visualmente el PDF
export function CallSheetPreview({
  date,
  location,
  callTime,
  crewSeleccionado,
  safetyNotes,
  weatherPlanB,
  proyecto = "JERÓNIMO",
}: {
  date: string;
  location: string;
  callTime: string;
  crewSeleccionado: CrewMember[];
  safetyNotes: string;
  weatherPlanB: string;
  proyecto?: string;
}) {
  const grupos: Record<string, CrewMember[]> = {};
  for (const m of crewSeleccionado) {
    const d = departamentoDeRol(m.role);
    if (!grupos[d]) grupos[d] = [];
    grupos[d].push(m);
  }

  return (
    <div className="rounded-lg bg-[#1a1a1a] border border-borde p-6 text-sm">
      <header className="border-b-2 border-acento pb-3 mb-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-2xl font-bold text-acento tracking-tight">
            {proyecto}
          </h2>
          <span className="text-xs text-textoSec">CALL SHEET</span>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-textoSec text-xs">
          <span>
            <strong className="text-white">Fecha:</strong>{" "}
            {date ? formatDate(date) : "—"}
          </span>
          <span>
            <strong className="text-white">Locación:</strong> {location || "—"}
          </span>
          <span>
            <strong className="text-white">Llamado general:</strong>{" "}
            {callTime || "—"}
          </span>
        </div>
      </header>

      <section className="mb-4">
        <h3 className="text-xs uppercase tracking-wider text-acento mb-2">
          Crew · {crewSeleccionado.length}
        </h3>
        {crewSeleccionado.length === 0 ? (
          <p className="text-textoSec text-xs">Selecciona miembros del crew.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(grupos).map(([depto, miembros]) => (
              <div key={depto}>
                <p className="text-[11px] font-semibold text-textoSec uppercase mb-1">
                  {depto}
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-textoSec border-b border-borde">
                      <th className="text-left py-1">Nombre</th>
                      <th className="text-left py-1">Rol</th>
                      <th className="text-left py-1">Tel</th>
                      <th className="text-left py-1">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {miembros.map((m) => (
                      <tr key={m.id} className="border-b border-borde/40">
                        <td className="py-1">{m.name}</td>
                        <td className="py-1 text-textoSec">{m.role}</td>
                        <td className="py-1 text-textoSec">{m.phone ?? "—"}</td>
                        <td className="py-1 text-textoSec">{m.email ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {safetyNotes && (
        <section className="mb-3">
          <h3 className="text-xs uppercase tracking-wider text-acento mb-1">
            Notas de seguridad
          </h3>
          <p className="text-xs text-textoSec whitespace-pre-line">{safetyNotes}</p>
        </section>
      )}

      {weatherPlanB && (
        <section>
          <h3 className="text-xs uppercase tracking-wider text-acento mb-1">
            Plan B clima
          </h3>
          <p className="text-xs text-textoSec whitespace-pre-line">{weatherPlanB}</p>
        </section>
      )}
    </div>
  );
}
