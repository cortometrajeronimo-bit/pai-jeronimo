import * as React from "react";
import { cn } from "@/lib/utils";

// Select nativo con estilo del sistema (sin Radix por simplicidad)
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-borde bg-superficieAlt px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
