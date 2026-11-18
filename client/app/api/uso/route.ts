import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { recusarSeNaoForAgente } from "@/lib/agente";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { sessaoVoz } from "@/lib/db/schema-app";
import {
  CAMPOS_BUSCA,
  CAMPOS_TOKENS,
  custoBuscaUsd,
  custoUsd,
  PLANOS,
  type Tokens,
  type UsoBusca,
} from "@/lib/planos";
import { resumoDoPlano } from "@/lib/planos-servidor";

/**
 * Relatório de consumo enviado pelo agente (server/agent) a cada ~15 s e no fim da
 * sessão. O agente só mede; quem decide se a sessão continua é o app, que conhece o
 * plano, os preços e o saldo do usuário. A resposta diz ao agente se deve encerrar.
 *
 * Os valores são ACUMULADOS da sessão e gravados com greatest(): relatórios repetidos
 * ou fora de ordem não somam duas vezes nem fazem o consumo "voltar".
 */

type Motivo = "creditos" | "duracao";

function inteiroNaoNegativo(v: unknown) {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

export async function POST(req: Request) {
  const recusa = recusarSeNaoForAgente(req);
  if (recusa) return recusa;

  const corpo = await req.json().catch(() => null);
  const sala = typeof corpo?.sala === "string" ? corpo.sala : null;
  const duracaoS = inteiroNaoNegativo(corpo?.duracaoS);
  const final = corpo?.final === true;
  const tokens = {} as Tokens;
  for (const campo of CAMPOS_TOKENS) {
    const v = inteiroNaoNegativo(corpo?.tokens?.[campo]);
    if (v === null) return NextResponse.json({ error: `Campo inválido: tokens.${campo}` }, { status: 400 });
    tokens[campo] = v;
  }
  // Pesquisas na internet: opcional, para aceitar relatórios de agentes anteriores a ela.
  const busca: UsoBusca = { buscas: 0, entrada: 0, entradaCache: 0, saida: 0 };
  if (corpo?.busca !== undefined) {
    for (const campo of CAMPOS_BUSCA) {
      const v = inteiroNaoNegativo(corpo.busca?.[campo]);
      if (v === null) return NextResponse.json({ error: `Campo inválido: busca.${campo}` }, { status: 400 });
      busca[campo] = v;
    }
  }
  if (!sala || duracaoS === null) {
    return NextResponse.json({ error: "Informe sala e duracaoS." }, { status: 400 });
  }

  const custoBusca = custoBuscaUsd(busca);
  const custo = custoUsd(tokens, duracaoS) + custoBusca;
  const agora = new Date();
  const maior = <T,>(coluna: T, valor: number) => sql`greatest(${coluna}, ${valor})`;

  const [sessao] = await db
    .update(sessaoVoz)
    .set({
      duracaoS: maior(sessaoVoz.duracaoS, duracaoS),
      tokensEntradaTexto: maior(sessaoVoz.tokensEntradaTexto, tokens.entradaTexto),
      tokensEntradaTextoCache: maior(sessaoVoz.tokensEntradaTextoCache, tokens.entradaTextoCache),
      tokensEntradaAudio: maior(sessaoVoz.tokensEntradaAudio, tokens.entradaAudio),
      tokensEntradaAudioCache: maior(sessaoVoz.tokensEntradaAudioCache, tokens.entradaAudioCache),
      tokensEntradaImagem: maior(sessaoVoz.tokensEntradaImagem, tokens.entradaImagem),
      tokensEntradaImagemCache: maior(sessaoVoz.tokensEntradaImagemCache, tokens.entradaImagemCache),
      tokensSaidaTexto: maior(sessaoVoz.tokensSaidaTexto, tokens.saidaTexto),
      tokensSaidaAudio: maior(sessaoVoz.tokensSaidaAudio, tokens.saidaAudio),
      buscasWeb: maior(sessaoVoz.buscasWeb, busca.buscas),
      custoBuscaUsd: maior(sessaoVoz.custoBuscaUsd, custoBusca),
      custoUsd: maior(sessaoVoz.custoUsd, custo),
      atualizadaEm: agora,
      ...(final ? { encerradaEm: agora } : {}),
    })
    .where(eq(sessaoVoz.sala, sala))
    .returning({ userId: sessaoVoz.userId, motivoEncerramento: sessaoVoz.motivoEncerramento });

  // Só salas criadas pelo /api/token são aceitas.
  if (!sessao) return NextResponse.json({ error: "Sala desconhecida." }, { status: 404 });

  const [dono] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.id, sessao.userId))
    .limit(1);
  if (!dono) return NextResponse.json({ encerrar: true, motivo: "creditos" satisfies Motivo });

  // O plano é lido a cada relatório: um upgrade feito pelo administrador vale na hora.
  const resumo = await resumoDoPlano(dono);
  const plano = PLANOS[resumo.plano];
  let motivo: Motivo | null = null;
  if (resumo.restantesCreditos !== null && resumo.restantesCreditos <= 0) motivo = "creditos";
  else if (plano.duracaoMaxMin !== null && duracaoS >= plano.duracaoMaxMin * 60) motivo = "duracao";

  if (motivo && !sessao.motivoEncerramento) {
    await db.update(sessaoVoz).set({ motivoEncerramento: motivo }).where(eq(sessaoVoz.sala, sala));
  }

  return NextResponse.json({
    encerrar: motivo !== null,
    motivo,
    plano: resumo.plano,
    restantesCreditos: resumo.restantesCreditos,
  });
}
