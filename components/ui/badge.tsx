import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Badge reutilizable: estados, tags, categorías
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-superficieAlt text-textoSec border border-borde",
        success: "bg-exito/15 text-exito border border-exito/30",
        warning: "bg-advertencia/15 text-advertencia border border-advertencia/30",
        danger: "bg-error/15 text-error border border-error/30",
        accent: "bg-acento/15 text-acento border border-acento/30",
        outline: "border border-borde text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
