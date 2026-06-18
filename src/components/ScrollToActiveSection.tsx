"use client";

import { useEffect } from "react";

export function ScrollToActiveSection({ targetId }: { targetId: string }) {
  useEffect(() => {
    // Respetar links compartidos a un día puntual (#dia-YYYY-MM-DD).
    if (window.location.hash) return;
    document.getElementById(targetId)?.scrollIntoView({ block: "start" });
  }, [targetId]);

  return null;
}
