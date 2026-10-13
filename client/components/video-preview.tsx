"use client";

import { Track } from "livekit-client";
import { useTracks, VideoTrack } from "@livekit/components-react";

export function VideoPreview() {
  const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera], {
    onlySubscribed: false,
  });
  // O agente assina um único vídeo e troca para a última track recebida; a tela tem
  // precedência aqui pelo mesmo motivo que os botões são mutuamente exclusivos.
  const local = tracks.find((t) => t.participant.isLocal);
  const isScreen = local?.source === Track.Source.ScreenShare;

  return (
    <section className="astra-panel overflow-hidden">
      <header className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <h2 className="text-[11px] font-medium tracking-widest text-(--astra-text-dimmer)">
          O QUE A ASTRA VÊ
        </h2>
        {local && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-(--astra-text-dim)">
            <span className="h-1.5 w-1.5 rounded-full bg-(--astra-online)" />
            {isScreen ? "Tela" : "Câmera"}
          </span>
        )}
      </header>

      <div className="relative aspect-video w-full bg-black/35">
        {local ? (
          <VideoTrack trackRef={local} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <EyeOffIcon />
            <p className="text-xs text-(--astra-text-dimmer)">
              Ligue a câmera ou compartilhe a tela para a Astra enxergar.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-(--astra-text-dimmer)"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
