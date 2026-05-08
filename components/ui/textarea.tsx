import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-borde bg-superficieAlt px-3 py-2 text-sm text-white placeholder:text-textoSec focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
