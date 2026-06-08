export function isAllowedEmail(
  email: string | null | undefined,
  domain: string,
): boolean {
  if (!email || !domain?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${domain.trim().toLowerCase()}`);
}

/**
 * Mapea el código de error de Auth.js (query param `error` en la home) a un
 * mensaje en español. Devuelve `null` cuando no hay error que mostrar.
 */
export function loginErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  if (code === "AccessDenied") {
    return "Esa cuenta no tiene acceso. Arz Prode es exclusivo para cuentas @arzion. Probá de nuevo y elegí tu cuenta de trabajo.";
  }
  return "Hubo un problema al iniciar sesión. Intentá de nuevo.";
}

export function isAdmin(
  email: string | null | undefined,
  adminEmails: string | null | undefined,
): boolean {
  if (!email || !adminEmails) return false;
  const target = email.trim().toLowerCase();
  return adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}
