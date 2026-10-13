"use client";

import type { ReactNode } from "react";
import type { LocalAudioTrack } from "livekit-client";
import { useLocalParticipant, useTrackVolume, DisconnectButton } from "@livekit/components-react";

export function ControlBar() {
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    microphoneTrack,
    lastMicrophoneError,
  } = useLocalParticipant();

  const micLevel = useTrackVolume(microphoneTrack?.track as LocalAudioTrack | undefined);

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
      <div className="astra-panel flex items-center gap-2 px-3 py-2.5">
        <div className="relative">
          <IconButton
            active={isMicrophoneEnabled}
            label={isMicrophoneEnabled ? "Mutar microfone" : "Ativar microfone"}
            onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          >
            {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
          {isMicrophoneEnabled && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-(--astra-blue-light) transition-opacity duration-75"
              style={{ opacity: Math.min(1, micLevel * 6) }}
            />
          )}
        </div>

        <IconButton
          active={isCameraEnabled}
          label={isCameraEnabled ? "Desligar câmera" : "Ligar câmera"}
          onClick={toggleCamera}
        >
          {isCameraEnabled ? <CameraOnIcon /> : <CameraOffIcon />}
        </IconButton>

        <IconButton
          active={isScreenShareEnabled}
          label={isScreenShareEnabled ? "Parar de compartilhar a tela" : "Compartilhar a tela"}
          onClick={toggleScreenShare}
        >
          {isScreenShareEnabled ? <ScreenShareOffIcon /> : <ScreenShareIcon />}
        </IconButton>

        <span className="mx-1 h-6 w-px bg-white/8" />

        <DisconnectButton
          className="flex h-11 w-11 items-center justify-center rounded-full border border-red-400/25 bg-red-500/12 text-red-300 transition-colors hover:bg-red-500/22"
          aria-label="Encerrar conversa"
        >
          <EndCallIcon />
        </DisconnectButton>
      </div>

      {lastMicrophoneError && (
        <p className="max-w-xs text-center text-xs text-red-400">
          Erro no microfone: {lastMicrophoneError.message}
        </p>
      )}
    </div>
  );
}

function IconButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ${
        active
          ? "border-(--astra-border) bg-(--astra-blue)/18 text-(--astra-blue-light) hover:bg-(--astra-blue)/28"
          : "border-white/6 bg-white/3 text-(--astra-text-dimmer) hover:bg-white/8 hover:text-(--astra-text-dim)"
      }`}
    >
      {children}
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 4.6 2.55M15 9.34V4a3 3 0 0 0-5.68-1.33" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CameraOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 1l22 22" />
      <path d="M21 21H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l.01-.01" />
      <path d="M15 5h1l2 3h4a2 2 0 0 1 2 2v9.34" />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="9 10 12 7 15 10" />
      <line x1="12" y1="7" x2="12" y2="13" />
    </svg>
  );
}

function ScreenShareOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.86.29 1.76.47 2.69.55A2 2 0 0 1 22 16.72V19a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3 4.18 2 2 0 0 1 5 2h2.28a2 2 0 0 1 2 1.72c.08.93.26 1.83.55 2.69a2 2 0 0 1-.45 2.11L8.11 9.79" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}
