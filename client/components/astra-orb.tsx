"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export type AstraOrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

const AstraOrbScene = dynamic(() => import("./astra-orb-scene").then((m) => m.AstraOrbScene), {
  ssr: false,
});

// As barras animam sempre: ligar e desligar a classe de animação cortava o movimento
// no meio do ciclo. A intensidade controla opacidade e ritmo, que transicionam suave.
const WAVE_INTENSITY: Record<AstraOrbState, number> = {
  idle: 0.12,
  connecting: 0.35,
  listening: 0.65,
  thinking: 0.5,
  speaking: 1,
};

const GLOW_OPACITY: Record<AstraOrbState, number> = {
  idle: 0.35,
  connecting: 0.5,
  listening: 0.65,
  thinking: 0.75,
  speaking: 0.95,
};

const BAR_HEIGHTS = [10, 18, 26, 18, 10];

export function AstraOrb({ state }: { state: AstraOrbState }) {
  const bars = useMemo(() => BAR_HEIGHTS.map((h, i) => ({ h, i })), []);
  const waveIntensity = WAVE_INTENSITY[state];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <Waveform bars={bars} intensity={waveIntensity} />

      <div className="relative h-72 w-72 sm:h-80 sm:w-80 lg:h-[22rem] lg:w-[22rem]">
        <div
          className="astra-glow-pulse pointer-events-none absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 ease-out"
          style={{
            background: "radial-gradient(circle, var(--astra-blue) 0%, transparent 68%)",
            opacity: GLOW_OPACITY[state],
          }}
        />
        <AstraOrbScene state={state} />
        <OrbBadge className="left-[6%] top-[18%]" icon="eye" />
        <OrbBadge className="right-[8%] bottom-[16%]" icon="camera" />
      </div>

      <Waveform bars={bars} intensity={waveIntensity} mirrored />
    </div>
  );
}

function Waveform({
  bars,
  intensity,
  mirrored,
}: {
  bars: { h: number; i: number }[];
  intensity: number;
  mirrored?: boolean;
}) {
  const ordered = mirrored ? [...bars].reverse() : bars;
  return (
    <div className="hidden h-16 items-center gap-1 sm:flex">
      {ordered.map(({ h, i }) => (
        <span
          key={i}
          className="astra-wave-bar inline-block transition-opacity duration-700 ease-out"
          style={{
            width: 3,
            height: h,
            borderRadius: 999,
            background: "linear-gradient(180deg, var(--astra-cyan), var(--astra-blue))",
            opacity: 0.14 + intensity * 0.66,
            animationDelay: `${i * 0.12}s`,
            animationDuration: `${1.4 - intensity * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}

function OrbBadge({ className, icon }: { className: string; icon: "eye" | "camera" }) {
  return (
    <div
      className={`astra-badge-glow absolute z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#0b1330]/80 text-(--astra-blue-light) backdrop-blur-sm ${className}`}
    >
      {icon === "eye" ? <EyeIcon /> : <CameraIcon />}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
