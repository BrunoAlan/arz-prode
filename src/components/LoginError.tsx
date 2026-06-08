import { TriangleAlert } from "lucide-react";

/**
 * Aviso de error de login. Componente presentacional: recibe el mensaje ya
 * resuelto (ver `loginErrorMessage` en lib/access) y solo lo muestra.
 */
export function LoginError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-rise flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-left text-sm text-destructive"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
