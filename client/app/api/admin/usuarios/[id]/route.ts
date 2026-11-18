import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { planoUsuario } from "@/lib/db/schema-app";
import { ehPlanoId } from "@/lib/planos";
import { ehAdminPorEmail } from "@/lib/planos-servidor";

/** Troca o plano de um usuário. Enquanto não há pagamento integrado, é assim que se faz upgrade. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/usuarios/[id]">) {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const { id } = await ctx.params;
  const corpo = await req.json().catch(() => null);
  if (!ehPlanoId(corpo?.plano)) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const [alvo] = await db.select({ email: user.email }).from(user).where(eq(user.id, id)).limit(1);
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (ehAdminPorEmail(alvo.email)) {
    return NextResponse.json(
      { error: "Este administrador é definido por ADMIN_EMAILS e não pode ser alterado aqui." },
      { status: 400 },
    );
  }

  const agora = new Date();
  await db
    .insert(planoUsuario)
    .values({ userId: id, plano: corpo.plano, atualizadoEm: agora, atualizadoPor: acesso.session.user.id })
    .onConflictDoUpdate({
      target: planoUsuario.userId,
      set: { plano: corpo.plano, atualizadoEm: agora, atualizadoPor: acesso.session.user.id },
    });

  return NextResponse.json({ ok: true, plano: corpo.plano });
}
