import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { planoUsuario, sessaoVoz } from "./db/schema-app";
import {
  ehPlanoId,
  fimDoCiclo,
  inicioDoCiclo,
  PLANO_PADRAO,
  PLANOS,
  usdParaCreditos,
  type PlanoId,
  type ResumoPlano,
} from "./planos";

type UsuarioBasico = { id: string; email: string };

/**
 * Administradores vêm da variável ADMIN_EMAILS (separados por vírgula), não do banco:
 * assim o e-mail do dono não vai para o código, e ninguém consegue tirar o próprio
 * acesso de administrador pela interface por engano.
 */
function emailsAdmin() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function ehAdminPorEmail(email: string) {
  return emailsAdmin().has(email.toLowerCase());
}

export async function planoDoUsuario(u: UsuarioBasico): Promise<PlanoId> {
  if (ehAdminPorEmail(u.email)) return "nucleo";
  const [linha] = await db
    .select({ plano: planoUsuario.plano })
    .from(planoUsuario)
    .where(eq(planoUsuario.userId, u.id))
    .limit(1);
  return linha && ehPlanoId(linha.plano) ? linha.plano : PLANO_PADRAO;
}

export async function custoDoCicloUsd(userId: string, agora = new Date()) {
  const [r] = await db
    .select({ total: sql<number>`coalesce(sum(${sessaoVoz.custoUsd}), 0)` })
    .from(sessaoVoz)
    .where(and(eq(sessaoVoz.userId, userId), gte(sessaoVoz.iniciadaEm, inicioDoCiclo(agora))));
  return Number(r?.total ?? 0);
}

export async function resumoDoPlano(u: UsuarioBasico): Promise<ResumoPlano> {
  const agora = new Date();
  const [plano, custo] = await Promise.all([planoDoUsuario(u), custoDoCicloUsd(u.id, agora)]);
  const limite = PLANOS[plano].creditosMensais;
  const usados = usdParaCreditos(custo);
  return {
    plano,
    limiteCreditos: limite,
    usadosCreditos: usados,
    restantesCreditos: limite === null ? null : Math.max(0, limite - usados),
    renovaEm: fimDoCiclo(agora).toISOString(),
    admin: plano === "nucleo",
  };
}
