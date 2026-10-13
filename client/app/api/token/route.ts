import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function GET() {
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

  const suffix = Math.floor(Math.random() * 100_000)
    .toString()
    .padStart(5, "0");
  const participantName = `astra_user_${suffix}`;
  const roomName = `astra_room_${suffix}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
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
