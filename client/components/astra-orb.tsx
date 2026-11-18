"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";

export type AstraOrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

const AstraOrbScene = dynamic(() => import("./astra-orb-scene").then((m) => m.AstraOrbScene), {
  ssr: false,
});

const GLOW_OPACITY: Record<AstraOrbState, number> = {
  idle: 0.35,
  connecting: 0.45,
  listening: 0.55,
  thinking: 0.7,
  speaking: 0.8,
};

// Em telas baixas (notebook 1366×768) a caixa encolhe para o palco caber sem rolagem.
const SIZES = {
  md: "h-60 w-60 xl:h-68 xl:w-68 [@media(max-height:820px)]:h-52! [@media(max-height:820px)]:w-52!",
  lg: "h-72 w-72 sm:h-84 sm:w-84 xl:h-96 xl:w-96 [@media(max-height:820px)]:h-68! [@media(max-height:820px)]:w-68!",
} as const;

export function AstraOrb({
  state,
  size = "lg",
  nivelRef,
}: {
  state: AstraOrbState;
  size?: keyof typeof SIZES;
  /** Volume atual do áudio (0–1), lido a cada quadro para a esfera reagir à voz. */
  nivelRef?: RefObject<number>;
}) {
  return (
    <div className={`relative shrink-0 ${SIZES[size]}`}>
      {/* Halo amplo atrás do canvas; o brilho próximo da esfera é feito no próprio WebGL. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[8%] rounded-full blur-3xl transition-opacity duration-700 ease-out"
        style={{
          background:
            "radial-gradient(circle, rgb(124 140 255 / 0.5) 0%, rgb(167 139 250 / 0.2) 40%, rgb(56 214 245 / 0.08) 58%, transparent 72%)",
          opacity: GLOW_OPACITY[state],
        }}
      />
      <div className="absolute inset-0">
        <AstraOrbScene state={state} nivelRef={nivelRef} />
      </div>
    </div>
  );
}
