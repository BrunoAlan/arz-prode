export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatKickoff(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

export function formatDay(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function dayKey(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  // en-CA produce YYYY-MM-DD; estable para usar como clave/ancla.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
