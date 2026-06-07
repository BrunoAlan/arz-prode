import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Auth.js v5 con la config edge-safe (sin adapter/db) para el runtime Edge.
const { auth } = NextAuth(authConfig);

// Next.js 16 detecta el export de middleware vía análisis estático del AST y
// no reconoce un `export const { auth: middleware } = ...` (destructuring).
// Por eso exportamos la función ya destructurada como default export.
export default auth;

export const config = {
  matcher: [
    "/predicciones/:path*",
    "/llaves/:path*",
    "/posiciones/:path*",
    "/ranking/:path*",
    "/partido/:path*",
    "/admin/:path*",
  ],
};
