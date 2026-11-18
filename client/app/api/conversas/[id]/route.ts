import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TITULO_MAX } from "@/lib/conversas";
import { detalheConversa } from "@/lib/conversas-servidor";
import { db } from "@/lib/db";
import { conversa } from "@/lib/db/schema-app";

type Contexto = RouteContext<"/api/conversas/[id]">;

async function usuarioLogado() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

const naoEncontrada = () => NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
const semSessao = () => NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

/** Falas salvas da conversa, em ordem. */
export async function GET(_req: Request, ctx: Contexto) {
  const usuario = await usuarioLogado();
  if (!usuario) return semSessao();

  const { id } = await ctx.params;
  const detalhe = await detalheConversa(usuario.id, id);
  if (!detalhe) return naoEncontrada();
  return NextResponse.json(detalhe, { headers: { "Cache-Control": "no-store" } });
}

/** Renomeia. */
export async function PATCH(req: Request, ctx: Contexto) {
  const usuario = await usuarioLogado();
  if (!usuario) return semSessao();

  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => null);
  const titulo = typeof corpo?.titulo === "string" ? corpo.titulo.replace(/\s+/g, " ").trim() : "";
  if (!titulo) return NextResponse.json({ error: "Informe um título." }, { status: 400 });

  const [alterada] = await db
    .update(conversa)
    .set({ titulo: titulo.slice(0, TITULO_MAX) })
    .where(and(eq(conversa.id, id), eq(conversa.userId, usuario.id)))
    .returning({ titulo: conversa.titulo });
  if (!alterada) return naoEncontrada();
  return NextResponse.json({ ok: true, titulo: alterada.titulo });
}

/**
 * Apaga a conversa e todas as falas dela (cascade). O consumo das sessões fica: só o
 * vínculo com a conversa é desfeito, e o que já foi gasto continua contando no mês.
 */
export async function DELETE(_req: Request, ctx: Contexto) {
  const usuario = await usuarioLogado();
  if (!usuario) return semSessao();

  const { id } = await ctx.params;
  const [apagada] = await db
    .delete(conversa)
    .where(and(eq(conversa.id, id), eq(conversa.userId, usuario.id)))
    .returning({ id: conversa.id });
  if (!apagada) return naoEncontrada();
  return NextResponse.json({ ok: true });
}
