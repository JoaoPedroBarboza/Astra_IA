import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionView } from "@/components/session-view";
import { auth } from "@/lib/auth";
import { listarConversas } from "@/lib/conversas-servidor";
import { resumoDoPlano } from "@/lib/planos-servidor";

// O title.template do layout não se aplica à page do mesmo segmento (raiz).
export const metadata: Metadata = { title: "Sessão ao vivo · Astra IA" };

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [plano, conversas] = await Promise.all([
    resumoDoPlano(session.user),
    listarConversas(session.user.id),
  ]);

  return (
    <SessionView
      plano={plano}
      conversas={conversas}
      usuario={{
        nome: session.user.name,
        email: session.user.email,
        emailVerificado: session.user.emailVerified,
        // Com o cookie cache da sessão a data pode chegar como string; normaliza.
        criadoEm: new Date(session.user.createdAt).toISOString(),
      }}
    />
  );
}
