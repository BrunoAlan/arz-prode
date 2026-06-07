"use client";

import { useEffect, useState } from "react";
import { formatKickoff } from "@/lib/format";

export function LocalTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  // SSR y primer render de cliente usan el fallback determinista (Buenos Aires),
  // así no hay mismatch de hidratación. El effect lo pasa a la zona real del navegador.
  const [text, setText] = useState(() => formatKickoff(new Date(iso)));

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setText(formatKickoff(new Date(iso), tz));
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {text}
    </time>
  );
}
