"use client";

import { useEffect, useState } from "react";

export type SessionStatus = "offline" | "connecting" | "online";

const ROTULO: Record<SessionStatus, string> = {
  offline: "Offline",
  connecting: "Conectando",
  online: "Ao vivo",
};

const COR: Record<SessionStatus, string> = {
  offline: "bg-subtle",
  connecting: "bg-warn",
  online: "bg-ok",
};

function formatar(segundos: number) {
  const m = Math.floor(segundos / 60).toString().padStart(2, "0");
  const s = Math.floor(segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Só monta enquanto a sessão está ao vivo, então zera a cada sessão nova. */
function Duracao() {
  const [decorrido, setDecorrido] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setDecorrido((Date.now() - inicio) / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono tabular-nums text-fg">{formatar(decorrido)}</span>;
}

export function StatusDot({ status }: { status: SessionStatus }) {
  return (
    <span className="relative flex h-2 w-2">
      {status !== "offline" && (
        <span className={`absolute inline-flex h-full w-full animate-ping-soft rounded-full ${COR[status]}`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${COR[status]}`} />
    </span>
  );
}

export function ConnectionStatus({ status }: { status: SessionStatus }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-8 items-center gap-2 rounded-full border border-line bg-white/3 pl-3 pr-3.5 text-xs text-muted"
    >
      <StatusDot status={status} />
      <span className="font-medium text-fg">{ROTULO[status]}</span>
      {status === "online" && (
        <>
          <span className="text-subtle">·</span>
          <Duracao />
        </>
      )}
    </div>
  );
}
