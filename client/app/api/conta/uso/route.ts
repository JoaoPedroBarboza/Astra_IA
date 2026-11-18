import { and, desc, eq, gt, gte, or } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessaoVoz } from "@/lib/db/schema-app";
import { inicioDoCiclo, usdParaCreditos } from "@/lib/planos";
import { resumoDoPlano } from "@/lib/planos-servidor";

export type SessaoRecente = {
  sala: string;
  iniciadaEm: string;
  duracaoS: number;
  creditos: number;
  motivoEncerramento: string | null;
};

/** Plano, saldo do mês e últimas sessões do usuário logado. */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const [resumo, linhas] = await Promise.all([
    resumoDoPlano(session.user),
    db
      .select({
        sala: sessaoVoz.sala,
        iniciadaEm: sessaoVoz.iniciadaEm,
        duracaoS: sessaoVoz.duracaoS,
        custoUsd: sessaoVoz.custoUsd,
        motivoEncerramento: sessaoVoz.motivoEncerramento,
      })
      .from(sessaoVoz)
      .where(
        and(
          eq(sessaoVoz.userId, session.user.id),
          gte(sessaoVoz.iniciadaEm, inicioDoCiclo()),
          // Tokens emitidos que nunca viraram conversa não interessam ao usuário.
          or(gt(sessaoVoz.duracaoS, 0), gt(sessaoVoz.custoUsd, 0)),
        ),
      )
      .orderBy(desc(sessaoVoz.iniciadaEm))
      .limit(10),
  ]);

  const sessoes: SessaoRecente[] = linhas.map((l) => ({
    sala: l.sala,
    iniciadaEm: l.iniciadaEm.toISOString(),
    duracaoS: l.duracaoS,
    creditos: usdParaCreditos(l.custoUsd),
    motivoEncerramento: l.motivoEncerramento,
  }));

  return NextResponse.json({ resumo, sessoes }, { headers: { "Cache-Control": "no-store" } });
}
