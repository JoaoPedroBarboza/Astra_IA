import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarConversas } from "@/lib/conversas-servidor";

/** Histórico de conversas do usuário logado (menu lateral). */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

  const conversas = await listarConversas(session.user.id);
  return NextResponse.json({ conversas }, { headers: { "Cache-Control": "no-store" } });
}
