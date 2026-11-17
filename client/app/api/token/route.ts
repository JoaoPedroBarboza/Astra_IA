import { AccessToken } from "livekit-server-sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function GET() {
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

  // UUID em vez de um sufixo curto: uma colisão de nome colocaria dois usuários
  // na mesma sala, ouvindo um ao outro e o mesmo agente.
  const roomName = `astra_room_${crypto.randomUUID()}`;
  const participantName = session.user.name;

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
  };

  return NextResponse.json(details, {
    headers: { "Cache-Control": "no-store" },
  });
}
