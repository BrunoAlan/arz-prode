"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function Error({
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
    <StatusScreen
      eyebrow="Algo salió mal"
      title="Tuvimos un problema"
      description="Ocurrió un error inesperado. Probá de nuevo en un momento."
    >
      <Button size="lg" onClick={() => unstable_retry()}>
        Reintentar
      </Button>
    </StatusScreen>
  );
}
