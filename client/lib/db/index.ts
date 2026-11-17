import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

// Sem a variável, o pg cai no padrão localhost:5432 e o erro vira algo ilegível
// como "SASL: client password must be a string". O build não consulta o banco,
// então só ele pode seguir sem ela.
if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error(
    "DATABASE_URL não configurada: preencha client/.env.local (veja client/.env.local.example).",
  );
}

// Em dev o hot reload reexecuta este módulo a cada edição; guardar o pool no
// globalThis evita abrir um pool novo (e esgotar as conexões do Neon) toda vez.
const globalParaDb = globalThis as unknown as { pool?: Pool };

const pool = globalParaDb.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalParaDb.pool = pool;

export const db = drizzle(pool, { schema });
