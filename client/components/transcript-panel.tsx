"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocalParticipant, useTranscriptions } from "@livekit/components-react";

type Entry = {
  id: string;
  from: "user" | "astra";
  text: string;
  at: number;
};

export function TranscriptPanel({ connected }: { connected: boolean }) {
  const transcriptions = useTranscriptions();
  const { localParticipant } = useLocalParticipant();
  const scrollRef = useRef<HTMLDivElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const localIdentity = localParticipant?.identity;
    return transcriptions
      .map((t) => ({
        id: t.streamInfo.id,
        from: t.participantInfo.identity === localIdentity ? ("user" as const) : ("astra" as const),
        text: t.text,
        at: t.streamInfo.timestamp,
      }))
      .sort((a, b) => a.at - b.at);
  }, [transcriptions, localParticipant?.identity]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries.length]);

  return (
    <section className="astra-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-white/6 px-4 py-3">
        <h2 className="text-[11px] font-medium tracking-widest text-(--astra-text-dimmer)">
          TRANSCRIÇÃO
        </h2>
        {connected && entries.length > 0 && (
          <span className="ml-auto text-[11px] text-(--astra-text-dimmer)">
            {entries.length} {entries.length === 1 ? "fala" : "falas"}
          </span>
        )}
      </header>

      <div
        ref={scrollRef}
        className={`astra-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 ${
          entries.length === 0 ? "flex items-center justify-center" : "space-y-3"
        }`}
      >
        {entries.length === 0 ? (
          <p className="max-w-[16rem] text-center text-sm text-(--astra-text-dimmer)">
            {connected
              ? "A conversa aparece aqui conforme vocês falam."
              : "Conecte-se para ver a conversa em tempo real."}
          </p>
        ) : (
          entries.map((entry) => <TranscriptLine key={entry.id} entry={entry} />)
        )}
      </div>
    </section>
  );
}

function TranscriptLine({ entry }: { entry: Entry }) {
  const isUser = entry.from === "user";
  return (
    <div className="astra-fade-up flex flex-col gap-1">
      <span
        className={`text-[11px] font-medium tracking-wide ${
          isUser ? "text-(--astra-text-dimmer)" : "text-(--astra-blue-light)"
        }`}
      >
        {isUser ? "Você" : "Astra"}
      </span>
      <p
        className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser ? "bg-white/4 text-(--astra-text-dim)" : "bg-(--astra-blue)/12 text-foreground"
        }`}
      >
        {entry.text}
      </p>
    </div>
  );
}
