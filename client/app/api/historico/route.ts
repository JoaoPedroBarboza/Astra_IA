import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { recusarSeNaoForAgente } from "@/lib/agente";
import { TITULO_MAX, type Papel } from "@/lib/conversas";
import { db } from "@/lib/db";
import { conversa, mensagem, sessaoVoz } from "@/lib/db/schema-app";

/**
 * Histórico de conversas, do lado do agente (server/agent/historico.py):
 * - GET  ?sala=  → falas das sessões ANTERIORES da conversa, para a Astra retomar o assunto;
 * - POST         → grava falas da sessão atual (e, no fim, o título gerado).
 *
 * O agente só conhece a sala; a conversa é sempre a que o /api/token ligou a ela, então
 * ele não consegue ler nem gravar a conversa de outra pessoa.
 */

/** Quantas falas anteriores a Astra recebe ao continuar uma conversa. */
const CONTEXTO_MENSAGENS = 40;
const TEXTO_MAX = 20_000;
const LOTE_MAX = 200;

async function conversaDaSala(sala: string) {
  const [s] = await db
    .select({ conversaId: sessaoVoz.conversaId })
    .from(sessaoVoz)
    .where(eq(sessaoVoz.sala, sala))
    .limit(1);
  return s;
}

export async function GET(req: NextRequest) {
  const recusa = recusarSeNaoForAgente(req);
  if (recusa) return recusa;

  const sala = req.nextUrl.searchParams.get("sala");
  if (!sala) return NextResponse.json({ error: "Informe a sala." }, { status: 400 });
  const s = await conversaDaSala(sala);
  if (!s) return NextResponse.json({ error: "Sala desconhecida." }, { status: 404 });
  if (!s.conversaId) return NextResponse.json({ conversaId: null, mensagens: [] });

  const recentes = await db
    .select({ papel: mensagem.papel, texto: mensagem.texto })
    .from(mensagem)
    .where(and(eq(mensagem.conversaId, s.conversaId), ne(mensagem.sala, sala)))
    .orderBy(desc(mensagem.criadaEm), desc(mensagem.itemId))
    .limit(CONTEXTO_MENSAGENS);

  return NextResponse.json({ conversaId: s.conversaId, mensagens: recentes.reverse() });
}

type Recebida = { id: string; papel: Papel; texto: string; criadaEm: Date; digitada: boolean };

function validar(m: unknown): Recebida | null {
  if (typeof m !== "object" || m === null) return null;
  const { id, papel, texto, criadaEm, digitada } = m as Record<string, unknown>;
  if (typeof id !== "string" || !id || id.length > 100) return null;
  if (papel !== "usuario" && papel !== "astra") return null;
  if (typeof texto !== "string" || !texto.trim()) return null;
  // criadaEm chega em segundos desde a época (time.time() do Python).
  if (typeof criadaEm !== "number" || !Number.isFinite(criadaEm) || criadaEm <= 0) return null;
  return {
    id,
    papel,
    texto: texto.trim().slice(0, TEXTO_MAX),
    criadaEm: new Date(criadaEm * 1000),
    digitada: digitada === true,
  };
}

export async function POST(req: Request) {
  const recusa = recusarSeNaoForAgente(req);
  if (recusa) return recusa;

  const corpo = await req.json().catch(() => null);
  const sala = typeof corpo?.sala === "string" ? corpo.sala : null;
  if (!sala) return NextResponse.json({ error: "Informe a sala." }, { status: 400 });
  const brutas: unknown[] = Array.isArray(corpo?.mensagens) ? corpo.mensagens : [];
  if (brutas.length > LOTE_MAX) {
    return NextResponse.json({ error: `No máximo ${LOTE_MAX} mensagens por envio.` }, { status: 400 });
  }
  const mensagens = brutas.map(validar);
  if (mensagens.some((m) => m === null)) {
    return NextResponse.json({ error: "Mensagem inválida no lote." }, { status: 400 });
  }

  const s = await conversaDaSala(sala);
  if (!s) return NextResponse.json({ error: "Sala desconhecida." }, { status: 404 });
  // A conversa foi apagada durante a sessão: respeita a exclusão e descarta o resto.
  if (!s.conversaId) return NextResponse.json({ ok: true, precisaTitulo: false });
  const conversaId = s.conversaId;

  // Um id repetido no mesmo lote faria o ON CONFLICT falhar ("cannot affect row a
  // second time"); vale a última versão da fala.
  const validas = [...new Map((mensagens as Recebida[]).map((m) => [m.id, m])).values()];
  if (validas.length > 0) {
    await db
      .insert(mensagem)
      .values(
        validas.map((m) => ({
          sala,
          conversaId,
          itemId: m.id,
          papel: m.papel,
          texto: m.texto,
          digitada: m.digitada,
          criadaEm: m.criadaEm,
        })),
      )
      // Reenvio da mesma fala (nova tentativa) atualiza em vez de duplicar.
      .onConflictDoUpdate({
        target: [mensagem.sala, mensagem.itemId],
        set: { texto: sql`excluded.texto`, digitada: sql`excluded.digitada` },
      });
    await db.update(conversa).set({ atualizadaEm: new Date() }).where(eq(conversa.id, conversaId));
  }

  // O título gerado pelo agente nunca sobrescreve um que já exista (ex.: renomeado).
  const titulo = typeof corpo?.titulo === "string" ? corpo.titulo.replace(/\s+/g, " ").trim() : "";
  if (titulo) {
    await db
      .update(conversa)
      .set({ titulo: titulo.slice(0, TITULO_MAX) })
      .where(and(eq(conversa.id, conversaId), isNull(conversa.titulo)));
  }

  const [atual] = await db
    .select({ titulo: conversa.titulo })
    .from(conversa)
    .where(eq(conversa.id, conversaId))
    .limit(1);
  return NextResponse.json({ ok: true, precisaTitulo: !!atual && atual.titulo === null });
}
