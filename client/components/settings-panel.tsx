"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useMediaDeviceSelect } from "@livekit/components-react";
import { CloseIcon, MicIcon, SlidersIcon, VideoIcon, VolumeIcon } from "./icons";

export function SettingsPanel({
  open,
  onClose,
  volume,
  onVolumeChange,
}: {
  open: boolean;
  onClose: () => void;
  volume: number;
  onVolumeChange: (value: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Em ref, e não na lista de dependências: o pai passa uma função nova a cada render
  // (mexer no volume já re-renderiza), e reexecutar o efeito roubaria o foco do slider.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Devolve o foco a quem abriu o painel.
      anterior?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar configurações"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-config"
        className="panel relative w-full max-w-md animate-scale-in bg-panel! shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] outline-none"
      >
        <div className="flex items-start gap-3 border-b border-line p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white/4 text-accent">
            <SlidersIcon size={17} />
          </span>
          <div className="flex-1">
            <h2 id="titulo-config" className="text-sm font-semibold text-fg">
              Dispositivos e áudio
            </h2>
            <p className="mt-0.5 text-xs text-muted">Escolha o que a Astra usa para ouvir e enxergar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/8 hover:text-fg"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <Secao titulo="Entrada">
            <DeviceSelect kind="audioinput" label="Microfone" icon={<MicIcon size={15} />} />
            <DeviceSelect kind="videoinput" label="Câmera" icon={<VideoIcon size={15} />} />
          </Secao>

          <Secao titulo="Saída">
            <label className="block space-y-3">
              <span className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-fg">
                  <span className="text-muted">
                    <VolumeIcon size={15} />
                  </span>
                  Volume da Astra
                </span>
                <span className="font-mono text-muted tabular-nums">{Math.round(volume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="astra-range w-full"
                style={{ "--valor": `${volume * 100}%` } as CSSProperties}
              />
            </label>
          </Secao>
        </div>

        <div className="flex justify-end border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary rounded-xl px-5 py-2 text-sm font-medium"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">{titulo}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function DeviceSelect({ kind, label, icon }: { kind: MediaDeviceKind; label: string; icon: ReactNode }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-xs font-medium text-fg">
        <span className="text-muted">{icon}</span>
        {label}
      </span>
      <select
        value={activeDeviceId}
        onChange={(e) => setActiveMediaDevice(e.target.value)}
        disabled={devices.length === 0}
        className="astra-select w-full rounded-xl border border-line bg-white/3 py-2.5 pl-3.5 pr-10 text-sm text-fg outline-none transition-colors hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
      >
        {devices.length === 0 ? (
          <option value="">Nenhum dispositivo encontrado</option>
        ) : (
          devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || "Dispositivo sem nome"}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
