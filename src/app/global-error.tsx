"use client";

import { useEffect } from "react";
import "./globals.css";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <StatusScreen
            eyebrow="Error"
            title="Algo salió mal"
            description="Ocurrió un error inesperado. Probá de nuevo en un momento."
          >
            <Button size="lg" onClick={() => unstable_retry()}>
              Reintentar
            </Button>
          </StatusScreen>
        </main>
      </body>
    </html>
  );
}
