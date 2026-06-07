export function isAllowedEmail(
  email: string | null | undefined,
  domain: string,
): boolean {
  if (!email || !domain) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(`@${domain.trim().toLowerCase()}`);
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
