import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { planoDoUsuario } from "./planos-servidor";

/**
 * Garante que quem chama é administrador (plano Núcleo). Devolve a sessão ou uma
 * resposta de erro pronta para a rota retornar.
 */
export async function exigirAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { erro: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) } as const;
  }
  if ((await planoDoUsuario(session.user)) !== "nucleo") {
    return { erro: NextResponse.json({ error: "Acesso restrito à administração." }, { status: 403 }) } as const;
  }
  return { session } as const;
}
