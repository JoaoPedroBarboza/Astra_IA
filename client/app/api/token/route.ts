import { AccessToken } from "livekit-server-sdk";
import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { conversaDoUsuario } from "@/lib/conversas-servidor";
import { db } from "@/lib/db";
import { conversa, sessaoVoz } from "@/lib/db/schema-app";
import { PLANOS } from "@/lib/planos";
import { resumoDoPlano } from "@/lib/planos-servidor";

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  /** Conversa do histórico à qual esta sessão pertence (nova ou continuada). */
  conversaId: string;
};

const formatoRenovacao = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "America/Sao_Paulo",
});

export async function GET(req: NextRequest) {
  // Cada token despacha um agente que consome créditos da OpenAI Realtime, então
  // só quem tem sessão válida (e-mail confirmado) recebe um.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      {
        error:
          "LiveKit não configurado no servidor. Preencha LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET em client/.env.local.",
      },
      { status: 500 },
    );
  }

  // Sem crédito, nem chega a abrir a sala: o agente nunca é despachado.
  const resumo = await resumoDoPlano(session.user);
  if (resumo.restantesCreditos !== null && resumo.restantesCreditos <= 0) {
    const plano = PLANOS[resumo.plano];
    return NextResponse.json(
      {
        error: `Os créditos do plano ${plano.nome} acabaram este mês. Eles renovam em ${formatoRenovacao.format(new Date(resumo.renovaEm))}.`,
        codigo: "CREDITOS_ESGOTADOS",
      },
      { status: 402 },
    );
  }

  // ?conversa=<id> continua uma conversa do histórico; sem ele, começa uma nova. A
  // checagem de dono impede abrir (e dar ao agente) a conversa de outra pessoa.
  const continuar = req.nextUrl.searchParams.get("conversa");
  let conversaId: string;
  if (continuar) {
    if (!(await conversaDoUsuario(session.user.id, continuar))) {
      return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
    }
    conversaId = continuar;
  } else {
    conversaId = crypto.randomUUID();
    await db.insert(conversa).values({ id: conversaId, userId: session.user.id });
  }

  // UUID em vez de um sufixo curto: uma colisão de nome colocaria dois usuários
  // na mesma sala, ouvindo um ao outro e o mesmo agente.
  const roomName = `astra_room_${crypto.randomUUID()}`;
  const participantName = session.user.name;

  // A sala é registrada antes de o agente existir: é por ela que o agente reporta o
  // consumo (/api/uso) e grava a conversa (/api/historico), e o app só aceita
  // chamadas de salas que ele mesmo criou.
  await db
    .insert(sessaoVoz)
    .values({ sala: roomName, userId: session.user.id, plano: resumo.plano, conversaId });

  // A identidade é o id do usuário no banco: o agente usa esse valor como chave
  // da memória no Mem0, então cada pessoa só lê e grava as próprias lembranças.
  const at = new AccessToken(apiKey, apiSecret, {
    identity: session.user.id,
    name: participantName,
    ttl: "15m",
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  const participantToken = await at.toJwt();

  const details: ConnectionDetails = {
    serverUrl,
    roomName,
    participantName,
    participantToken,
    conversaId,
  };

  return NextResponse.json(details, {
    headers: { "Cache-Control": "no-store" },
  });
}
