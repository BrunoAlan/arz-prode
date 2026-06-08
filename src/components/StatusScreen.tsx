import type { ReactNode } from "react";

/**
 * Pantalla de estado centrada (404, error, etc.). Presentacional puro: sin
 * hooks, usable desde server y client components. Modelado sobre el hero de
 * app/page.tsx para mantener coherencia visual.
 */
export function StatusScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
      {eyebrow && (
        <span className="animate-rise mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" /> {eyebrow}
        </span>
      )}
      <h1
        className="animate-rise font-display text-5xl font-semibold tracking-tight"
        style={{ animationDelay: "60ms" }}
      >
        {title}
      </h1>
      {description && (
        <p
          className="animate-rise mt-4 max-w-md text-lg text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          {description}
        </p>
      )}
      {children && (
        <div className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>
          {children}
        </div>
      )}
    </div>
  );
}
