// Traduce mensajes técnicos de PostgREST/Postgres a español comprensible.
export function traducirErrorSupabase(msg: string | null | undefined): string {
  if (!msg) return "Error desconocido.";
  const m = msg.toLowerCase();
  if (m.includes("row-level security") || m.includes("policy"))
    return "No tienes permiso sobre este proyecto.";
  if (m.includes("jwt") || m.includes("auth")) return "Sesión expirada. Inicia sesión de nuevo.";
  if (m.includes("violates foreign key"))
    return "Referencia inválida (proyecto, persona o categoría no existe).";
  if (m.includes("violates unique") || m.includes("duplicate key"))
    return "Ya existe un registro idéntico.";
  if (m.includes("not-null") || m.includes("null value"))
    return "Falta un campo obligatorio.";
  if (m.includes("invalid input syntax") && m.includes("date"))
    return "Fecha inválida.";
  if (m.includes("invalid input syntax") && m.includes("uuid"))
    return "Identificador inválido.";
  if (m.includes("numeric") || m.includes("overflow"))
    return "Monto fuera de rango.";
  return msg;
}
