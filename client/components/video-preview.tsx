"use client";

import { Track } from "livekit-client";
import { useTracks, VideoTrack } from "@livekit/components-react";
import { EyeOffIcon, ScanEyeIcon } from "./icons";

export function VideoPreview() {
  const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera], {
    onlySubscribed: false,
  });
  // O agente assina um único vídeo e troca para a última track recebida; a tela tem
  // precedência aqui pelo mesmo motivo que os botões são mutuamente exclusivos.
  const local = tracks.find((t) => t.participant.isLocal);
  const isScreen = local?.source === Track.Source.ScreenShare;

  return (
    <section className="panel shrink-0 overflow-hidden">
      <header className="flex h-12 items-center gap-2.5 border-b border-line px-4">
        <ScanEyeIcon size={16} className="text-muted" />
        <h2 className="text-sm font-medium text-fg">Visão computacional</h2>
        <span
          className={`ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            local ? "bg-accent/15 text-accent" : "bg-white/5 text-subtle"
          }`}
        >
          {local && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          {local ? (isScreen ? "Tela" : "Câmera") : "Desligada"}
        </span>
      </header>

      <div className="relative aspect-video w-full bg-black/40">
        {local ? (
          <>
            <VideoTrack trackRef={local} className="h-full w-full object-contain" />
            <MolduraDeAnalise />
          </>
        ) : (
          <div className="bg-dots absolute inset-0" />
        )}
        {!local && (
          <div className="relative flex h-full w-full flex-col items-center justify-center gap-2.5 px-6 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/3 text-subtle">
              <EyeOffIcon size={16} />
            </span>
            <p className="max-w-56 text-xs leading-relaxed text-muted">
              Ligue a câmera ou compartilhe a tela para a Astra enxergar o que você vê.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Cantos de mira e linha de varredura: deixam claro que a imagem está sendo analisada. */
function MolduraDeAnalise() {
  const canto = "absolute h-5 w-5 border-accent-cyan/80";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-3">
      <span className={`${canto} left-0 top-0 rounded-tl-md border-l-2 border-t-2`} />
      <span className={`${canto} right-0 top-0 rounded-tr-md border-r-2 border-t-2`} />
      <span className={`${canto} bottom-0 left-0 rounded-bl-md border-b-2 border-l-2`} />
      <span className={`${canto} bottom-0 right-0 rounded-br-md border-b-2 border-r-2`} />
      <span className="absolute inset-x-0 h-px animate-scan bg-linear-to-r from-transparent via-accent-cyan/70 to-transparent shadow-[0_0_12px_var(--color-accent-cyan)]" />
    </div>
  );
}
