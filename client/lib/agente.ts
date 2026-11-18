import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Autenticação das rotas chamadas pelo agente (server/agent), não pelo navegador:
 * `Authorization: Bearer <ASTRA_AGENT_SECRET>`. Devolve a resposta de erro, ou null
 * quando a chamada é legítima.
 */
export function recusarSeNaoForAgente(req: Request): NextResponse | null {
  const segredo = process.env.ASTRA_AGENT_SECRET;
  if (!segredo) {
    return NextResponse.json({ error: "ASTRA_AGENT_SECRET não configurado no app." }, { status: 503 });
  }
  const recebido = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(recebido);
  const b = Buffer.from(segredo);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}
