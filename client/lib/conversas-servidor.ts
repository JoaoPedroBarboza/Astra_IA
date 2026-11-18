import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversa, mensagem } from "@/lib/db/schema-app";
import { tituloExibido, type ConversaDetalhe, type ConversaResumo, type Papel } from "@/lib/conversas";

const LIMITE_LISTA = 100;
/** Uma conversa muito longa mostra as últimas falas; o resto continua no banco. */
const LIMITE_MENSAGENS = 1000;

const temFalaDoUsuario = sql`exists (
  select 1 from ${mensagem} where ${mensagem.conversaId} = ${conversa.id} and ${mensagem.papel} = 'usuario'
)`;

/**
 * Conversas do usuário, da mais recente para a mais antiga. Ficam de fora as que o
 * usuário não chegou a falar nada: a conversa nasce quando a sessão abre, e uma sessão
 * aberta e fechada só teria o cumprimento da Astra.
 */
export async function listarConversas(userId: string): Promise<ConversaResumo[]> {
  const linhas = await db
    .select({
      id: conversa.id,
      titulo: conversa.titulo,
      atualizadaEm: conversa.atualizadaEm,
      mensagens: sql<number>`(select count(*)::int from ${mensagem} where ${mensagem.conversaId} = ${conversa.id})`,
      primeiraFala: sql<string | null>`(
        select left(${mensagem.texto}, 120) from ${mensagem}
        where ${mensagem.conversaId} = ${conversa.id} and ${mensagem.papel} = 'usuario'
        order by ${mensagem.criadaEm} limit 1
      )`,
    })
    .from(conversa)
    .where(and(eq(conversa.userId, userId), temFalaDoUsuario))
    .orderBy(desc(conversa.atualizadaEm))
    .limit(LIMITE_LISTA);

  return linhas.map((l) => ({
    id: l.id,
    titulo: tituloExibido(l.titulo, l.primeiraFala),
    atualizadaEm: l.atualizadaEm.toISOString(),
    mensagens: l.mensagens,
  }));
}

/** A conversa, se for do usuário. É a checagem de dono usada por todas as rotas. */
export async function conversaDoUsuario(userId: string, id: string) {
  const [linha] = await db
    .select()
    .from(conversa)
    .where(and(eq(conversa.id, id), eq(conversa.userId, userId)))
    .limit(1);
  return linha ?? null;
}

export async function detalheConversa(userId: string, id: string): Promise<ConversaDetalhe | null> {
  const c = await conversaDoUsuario(userId, id);
  if (!c) return null;

  const recentes = await db
    .select()
    .from(mensagem)
    .where(eq(mensagem.conversaId, id))
    .orderBy(desc(mensagem.criadaEm), desc(mensagem.itemId))
    .limit(LIMITE_MENSAGENS);
  const mensagens = recentes.reverse();

  return {
    id: c.id,
    titulo: tituloExibido(c.titulo, mensagens.find((m) => m.papel === "usuario")?.texto ?? null),
    criadaEm: c.criadaEm.toISOString(),
    atualizadaEm: c.atualizadaEm.toISOString(),
    mensagens: mensagens.map((m) => ({
      id: `${m.sala}:${m.itemId}`,
      sala: m.sala,
      papel: m.papel as Papel,
      texto: m.texto,
      digitada: m.digitada,
      criadaEm: m.criadaEm.toISOString(),
    })),
  };
}
