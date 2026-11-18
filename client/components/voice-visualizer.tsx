"use client";

import type { LocalAudioTrack } from "livekit-client";
import {
  useLocalParticipant,
  useMultibandTrackVolume,
  useVoiceAssistant,
} from "@livekit/components-react";

const BANDAS = 9;

/**
 * Barras reativas ao áudio real: a voz da Astra enquanto ela fala, o microfone do
 * usuário enquanto ela escuta. Nos outros estados não há fonte, e as barras só
 * "respiram" — sinal de que a sessão está viva sem fingir um áudio que não existe.
 */
export function VoiceVisualizer() {
  const { state, audioTrack } = useVoiceAssistant();
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();

  const mic = isMicrophoneEnabled ? (microphoneTrack?.track as LocalAudioTrack | undefined) : undefined;
  const fonte = state === "speaking" ? audioTrack : state === "listening" ? mic : undefined;
  const bandas = useMultibandTrackVolume(fonte, { bands: BANDAS });

  const ativo = fonte !== undefined;
  // Graves no centro, espelhado para os lados.
  const barras = [...bandas].reverse().concat(bandas);
  const cor =
    state === "speaking"
      ? "from-accent-violet via-accent to-accent-cyan"
      : "from-accent-cyan/90 to-accent/80";

  return (
    <div aria-hidden className="flex h-11 items-center justify-center gap-[3px]">
      {barras.map((v, i) => {
        const distancia = Math.abs(i - (barras.length - 1) / 2);
        return ativo ? (
          <span
            key={i}
            className={`w-[3px] rounded-full bg-linear-to-b ${cor} transition-[height] duration-75`}
            style={{ height: Math.max(4, Math.min(1, v * 1.6) * 44) }}
          />
        ) : (
          <span
            key={i}
            className="h-5 w-[3px] animate-breathe rounded-full bg-white/15"
            style={{
              animationDelay: `${distancia * 0.09}s`,
              opacity: 0.9 - distancia * 0.07,
            }}
          />
        );
      })}
    </div>
  );
}
