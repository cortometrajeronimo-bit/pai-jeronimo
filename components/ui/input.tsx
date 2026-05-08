import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md border border-borde bg-superficieAlt px-3 py-2 text-sm text-white placeholder:text-textoSec focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
