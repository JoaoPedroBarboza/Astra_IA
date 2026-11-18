import { useId } from "react";

/** Símbolo da Astra: estrela de quatro pontas ("astra" = estrela) sobre o gradiente da marca. */
export function AstraMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="#6f7ff9" />
          <stop offset="1" stopColor="#2fc6ea" />
        </linearGradient>
        <radialGradient id={`${id}-hl`} cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${id}-bg)`} />
      <rect width="32" height="32" rx="9" fill={`url(#${id}-hl)`} />
      <path
        d="M16 6.5Q16.9 15.1 25.5 16 16.9 16.9 16 25.5 15.1 16.9 6.5 16 15.1 15.1 16 6.5Z"
        fill="#fff"
      />
      <circle cx="23.6" cy="8.6" r="1.5" fill="#fff" fillOpacity="0.85" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <AstraMark size={size} />
      <span className="text-[15px] font-semibold tracking-tight text-fg">
        Astra <span className="font-medium text-muted">IA</span>
      </span>
    </span>
  );
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function Avatar({ nome, size = 32 }: { nome: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#2a2f4a] to-[#161a2c] font-medium text-fg ring-1 ring-line-strong"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {iniciais(nome)}
    </span>
  );
}
