"use client";

import { useEffect } from "react";
import { useMediaDeviceSelect } from "@livekit/components-react";

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar configurações"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        className="astra-panel astra-scale-in relative w-full max-w-sm p-5"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-1 text-(--astra-text-dimmer) transition-colors hover:bg-white/8 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-5">
          <DeviceSelect kind="audioinput" label="Microfone" />
          <DeviceSelect kind="videoinput" label="Câmera" />

          <label className="block space-y-2">
            <span className="text-xs text-(--astra-text-dim)">
              Volume da Astra — {Math.round(volume * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="w-full accent-(--astra-blue-light)"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

function DeviceSelect({ kind, label }: { kind: MediaDeviceKind; label: string }) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

  return (
    <label className="block space-y-2">
      <span className="text-xs text-(--astra-text-dim)">{label}</span>
      <select
        value={activeDeviceId}
        onChange={(e) => setActiveMediaDevice(e.target.value)}
        disabled={devices.length === 0}
        className="w-full rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-(--astra-border) disabled:opacity-50"
      >
        {devices.length === 0 ? (
          <option value="">Nenhum dispositivo encontrado</option>
        ) : (
          devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId} className="bg-[#0d1526]">
              {device.label || "Dispositivo sem nome"}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
