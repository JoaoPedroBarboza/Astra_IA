"use client";

import { useEffect, useState } from "react";

export type SessionStatus = "offline" | "connecting" | "online";

const STATUS_LABEL: Record<SessionStatus, string> = {
  offline: "OFFLINE",
  connecting: "CONECTANDO",
  online: "ONLINE",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  offline: "bg-white/25",
  connecting: "bg-amber-400",
  online: "bg-(--astra-online)",
};

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

/** Só monta enquanto a sessão está online, então o contador zera a cada sessão nova. */
function Elapsed() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="tabular-nums">{formatElapsed(elapsed)}</span>;
}

export function StatusBar({ status }: { status: SessionStatus }) {
  return (
    <footer className="flex w-full items-center justify-center gap-3 border-t border-white/6 px-4 py-3 text-[11px] tracking-widest text-(--astra-text-dimmer)">
      <span className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[status]}`} />
        {STATUS_LABEL[status]}
      </span>
      {status === "online" && (
        <>
          <span className="text-white/15">•</span>
          <Elapsed />
        </>
      )}
      <span className="text-white/15">•</span>
      <span>ASTRA IA</span>
      <span className="text-white/15">•</span>
      <span>v1.0.0</span>
    </footer>
  );
}
