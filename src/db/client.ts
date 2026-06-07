import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// El fallback evita que `neon()` tire error al importar este módulo durante
// `next build` cuando todavía no hay DATABASE_URL (se configura más adelante).
// En runtime real la variable siempre tiene que estar seteada.
const sql = neon(
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/placeholder",
);
export const db = drizzle(sql, { schema });
