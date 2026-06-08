import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowedEmail, isAdmin } from "@/lib/access";

export const authConfig = {
  pages: { signIn: "/" },
  providers: [
    Google({
      // Las credenciales usan los nombres GOOGLE_CLIENT_* del .env.local
      // (Auth.js por defecto buscaría AUTH_GOOGLE_*). Vacías en build → OK.
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Forzar el selector de cuenta: si el browser ya tiene una sesión Google,
      // igual ofrece "Usar otra cuenta". Evita el loop de rechazo para quien
      // entró con una cuenta que no es @arzion.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      const email = profile?.email as string | undefined;
      const verified = (profile as { email_verified?: boolean })?.email_verified;
      return Boolean(verified) && isAllowedEmail(email, process.env.ALLOWED_DOMAIN!);
    },
    authorized({ auth }) {
      // El matcher del middleware ya limita esto a rutas protegidas.
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub!;
        session.user.isAdmin = isAdmin(
          session.user.email,
          process.env.ADMIN_EMAILS,
        );
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
