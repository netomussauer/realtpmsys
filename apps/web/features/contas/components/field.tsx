"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { cn } from "@/shared/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
  className?: string;
}

/** Rótulo + controle + dica/erro, ligando `label htmlFor` ao `id` gerado. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {cloneElement(children, { id })}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
