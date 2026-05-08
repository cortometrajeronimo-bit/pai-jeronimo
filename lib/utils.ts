import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper para combinar clases tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formato moneda colombiana
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formato fecha es-CO
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}
