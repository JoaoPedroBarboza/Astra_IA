"use client";

import type { ReactNode } from "react";
import { ConnectionState, type LocalAudioTrack } from "livekit-client";
import {
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  useTrackVolume,
} from "@livekit/components-react";
import {
  MicIcon,
  MicOffIcon,
  PhoneOffIcon,
  ScreenShareIcon,
  ScreenShareOffIcon,
  SlidersIcon,
  VideoIcon,
  VideoOffIcon,
} from "./icons";

export function ControlBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    microphoneTrack,
    lastMicrophoneError,
  } = useLocalParticipant();

  const micLevel = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);
  const room = useRoomContext();
  const connectionState = useConnectionState();

  // O agente mantém uma única assinatura de vídeo e troca para a track que chegou por
  // último, então publicar câmera e tela ao mesmo tempo tornaria imprevisível o que ele
  // enxerga. Ligar uma sempre desliga a outra.
  async function toggleCamera() {
    if (isCameraEnabled) {
      await localParticipant.setCameraEnabled(false);
      return;
    }
    await localParticipant.setCameraEnabled(true);
    if (isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
    }
  }

  async function toggleScreenShare() {
    if (isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
      return;
    }
    try {
      await localParticipant.setScreenShareEnabled(true);
    } catch {
      // O navegador lança quando o usuário fecha o seletor de tela.
      return;
    }
    if (isCameraEnabled) {
      await localParticipant.setCameraEnabled(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="toolbar"
        aria-label="Controles da sessão"
        className="flex items-center gap-1.5 rounded-2xl border border-line bg-panel/85 p-1.5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl"
      >
        <DockButton
          tone={isMicrophoneEnabled ? "on" : "danger"}
          pressed={isMicrophoneEnabled}
          label={isMicrophoneEnabled ? "Silenciar microfone" : "Ativar microfone"}
          onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        >
          {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
          {isMicrophoneEnabled && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-accent-cyan transition-opacity duration-75"
              style={{ opacity: Math.min(1, micLevel * 6) }}
            />
          )}
        </DockButton>

        <DockButton
          tone={isCameraEnabled ? "accent" : "off"}
          pressed={isCameraEnabled}
          label={isCameraEnabled ? "Desligar câmera" : "Ligar câmera"}
          onClick={toggleCamera}
        >
          {isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
        </DockButton>

        <DockButton
          tone={isScreenShareEnabled ? "accent" : "off"}
          pressed={isScreenShareEnabled}
          label={isScreenShareEnabled ? "Parar de compartilhar a tela" : "Compartilhar a tela"}
          onClick={toggleScreenShare}
        >
          {isScreenShareEnabled ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
        </DockButton>

        <span aria-hidden className="mx-1 h-6 w-px bg-line" />

        <DockButton tone="off" label="Dispositivos e áudio" onClick={onOpenSettings}>
          <SlidersIcon />
        </DockButton>

        {/* Botão próprio em vez do DisconnectButton do LiveKit: o CSS dele vem sem
            camada e sobrescreve as utilities do Tailwind. O efeito é o mesmo — o
            onDisconnected do LiveKitRoom volta a tela para o estado inicial. */}
        <button
          type="button"
          onClick={() => room.disconnect()}
          disabled={connectionState === ConnectionState.Disconnected}
          aria-label="Encerrar sessão"
          className="ml-1 flex h-11 items-center gap-2 rounded-xl bg-bad/15 px-4 text-sm font-medium text-bad ring-1 ring-bad/25 transition-colors hover:bg-bad/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PhoneOffIcon />
          <span className="hidden sm:inline">Encerrar</span>
        </button>
      </div>

      {lastMicrophoneError && (
        <p role="alert" className="max-w-xs text-center text-xs text-bad">
          Não foi possível usar o microfone: {lastMicrophoneError.message}
        </p>
      )}
    </div>
  );
}

const TONS = {
  on: "bg-white/8 text-fg hover:bg-white/12",
  off: "text-muted hover:bg-white/6 hover:text-fg",
  accent: "bg-accent/18 text-accent ring-1 ring-accent/35 hover:bg-accent/25",
  danger: "bg-bad/12 text-bad hover:bg-bad/20",
} as const;

function DockButton({
  tone,
  pressed,
  label,
  onClick,
  children,
}: {
  tone: keyof typeof TONS;
  pressed?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 ${TONS[tone]}`}
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line-strong bg-panel px-2.5 py-1 text-[11px] font-medium text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}
