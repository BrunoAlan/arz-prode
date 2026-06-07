import { auth } from "@/auth";
import { isAdmin } from "@/lib/access";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");
  return session.user as { id: string; email: string; name: string | null };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.email, process.env.ADMIN_EMAILS)) {
    throw new Error("No autorizado");
  }
  return user;
}
