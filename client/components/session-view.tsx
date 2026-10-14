"use client";

import { useState } from "react";
import "@livekit/components-styles";
import { LiveKitRoom, RoomAudioRenderer, useVoiceAssistant } from "@livekit/components-react";
import { useConnectionDetails } from "@/hooks/use-connection-details";
import { AstraOrb, type AstraOrbState } from "./astra-orb";
import { ControlBar } from "./control-bar";
import { StatusBar, type SessionStatus } from "./status-bar";
import { TranscriptPanel } from "./transcript-panel";
import { VideoPreview } from "./video-preview";
import { SettingsPanel } from "./settings-panel";

function mapAgentState(state: string): { orbState: AstraOrbState; label: string; subtitle: string } {
  switch (state) {
    case "listening":
      return { orbState: "listening", label: "Ouvindo", subtitle: "Pode falar, estou te escutando" };
    case "thinking":
      return { orbState: "thinking", label: "Pensando", subtitle: "Processando o que você disse" };
    case "speaking":
      return { orbState: "speaking", label: "Falando", subtitle: "Astra está respondendo" };
    case "connecting":
    case "initializing":
    case "idle":
    case "pre-connect-buffering":
      return { orbState: "connecting", label: "Conectando", subtitle: "Preparando a sessão" };
    default:
      return { orbState: "connecting", label: "Aguardando o agente", subtitle: "" };
  }
}

export function SessionView() {
  const { state, connect, reset } = useConnectionDetails();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [volume, setVolume] = useState(1);

  const details = state.status === "ready" ? state.details : undefined;
  const connected = state.status === "ready";
  const status: SessionStatus = connected
    ? "online"
    : state.status === "loading"
      ? "connecting"
      : "offline";

  // A casca trava na viewport a partir de lg, que é o que permite a transcrição rolar
  // por dentro; no mobile o layout é empilhado e a página rola normalmente.
  //
  // Dois detalhes não óbvios aqui:
  // - sem flex-1: como item flex do body, o flex-basis de flex-1 sobrepõe a altura;
  // - h-dvh com "!": o LiveKitRoom também aplica .lk-room-container, que define
  //   height:100%. Esse CSS vem sem camada e, na cascata, estilo sem camada vence
  //   o @layer utilities do Tailwind — sem o important ele ganharia.
  return (
    <LiveKitRoom
      serverUrl={details?.serverUrl}
      token={details?.participantToken}
      connect={connected}
      audio={connected}
      video={false}
      onDisconnected={reset}
      className="flex min-h-screen flex-col lg:h-dvh! lg:min-h-0"
    >
      <RoomAudioRenderer volume={volume} />

      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-(--astra-blue-light) shadow-[0_0_10px_var(--astra-blue-light)]" />
          <span className="text-sm font-medium tracking-wide text-foreground">Astra IA</span>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Configurações"
          title="Configurações"
          className="flex h-9 w-9 items-center justify-center rounded-full text-(--astra-text-dimmer) transition-colors hover:bg-white/6 hover:text-foreground"
        >
          <GearIcon />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-5 pb-5 sm:px-8 lg:min-h-0 lg:flex-row">
        <section className="flex min-h-104 flex-1 flex-col items-center justify-center gap-7 lg:min-h-0">
          {connected ? (
            <ConnectedStage />
          ) : (
            <IdleStage
              loading={state.status === "loading"}
              errorMessage={state.status === "error" ? state.message : null}
              onConnect={connect}
            />
          )}
        </section>

        <aside className="astra-slide-in flex w-full flex-col gap-4 lg:w-84 lg:min-h-0">
          <TranscriptPanel connected={connected} />
          <VideoPreview />
        </aside>
      </main>

      <StatusBar status={status} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        volume={volume}
        onVolumeChange={setVolume}
      />
    </LiveKitRoom>
  );
}

function ConnectedStage() {
  const { state: agentState } = useVoiceAssistant();
  const { orbState, label, subtitle } = mapAgentState(agentState);

  return (
    <div className="astra-fade-up flex flex-col items-center gap-7">
      <AstraOrb state={orbState} />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-xl font-medium tracking-tight text-foreground">{label}</p>
        {subtitle && <p className="text-sm text-(--astra-text-dim)">{subtitle}</p>}
      </div>
      <ControlBar />
    </div>
  );
}

function IdleStage({
  loading,
  errorMessage,
  onConnect,
}: {
  loading: boolean;
  errorMessage: string | null;
  onConnect: () => void;
}) {
  return (
    <div className="astra-fade-up flex flex-col items-center gap-7">
      <AstraOrb state={loading ? "connecting" : "idle"} />
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-medium tracking-tight text-foreground">
          {loading ? "Conectando" : "Pronto para conversar"}
        </p>
        <p className="max-w-sm text-sm text-(--astra-text-dim)">
          Converse por voz com a Astra. Ligue a câmera ou compartilhe a tela para que ela também
          enxergue o que você está vendo.
        </p>
        {errorMessage && <p className="max-w-sm text-sm text-red-400">{errorMessage}</p>}
      </div>
      <button
        type="button"
        onClick={onConnect}
        disabled={loading}
        className="rounded-full bg-(--astra-blue) px-9 py-3 text-sm font-medium text-white shadow-[0_0_34px_rgba(59,130,246,0.4)] transition-all duration-200 hover:bg-(--astra-blue-light) hover:shadow-[0_0_44px_rgba(96,165,250,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Conectando..." : "Conectar"}
      </button>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
