"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLocalParticipant } from "@livekit/components-react";
import type { ResumoPlano } from "@/lib/planos";
import { Avatar, Wordmark } from "./brand";
import { BotaoNovaConversa, ListaHistorico, type HistoricoProps } from "./history-list";
import {
  AudioLinesIcon,
  BrainIcon,
  HelpIcon,
  LogOutIcon,
  MicIcon,
  ScanEyeIcon,
  ShieldCheckIcon,
  SlidersIcon,
  SparklesIcon,
  UserIcon,
} from "./icons";
import { MedidorCreditos, renovacao, SeloPlano } from "./plan-meter";

type Tom = "on" | "warn" | "off";

const COR_TOM: Record<Tom, string> = {
  on: "bg-ok",
  warn: "bg-warn",
  off: "bg-subtle/60",
};

export function AppSidebar({
  usuario,
  resumo,
  connected,
  onOpenSettings,
  onOpenConta,
  onVerPlanos,
  onSair,
  saindo,
  historico,
}: {
  usuario: { nome: string; email: string };
  resumo: ResumoPlano;
  connected: boolean;
  onOpenSettings: () => void;
  onOpenConta: () => void;
  onVerPlanos: () => void;
  onSair: () => void;
  saindo: boolean;
  historico: HistoricoProps;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-sidebar lg:flex">
      <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
        <Wordmark size={26} />
      </div>

      <div className="flex shrink-0 flex-col gap-3 px-3 pt-4">
        <BotaoNovaConversa onClick={historico.onNova} bloqueado={historico.bloqueado} />
        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          <ItemNav ativo icon={<AudioLinesIcon size={16} />}>
            Sessão ao vivo
          </ItemNav>
          <ItemNav icon={<SlidersIcon size={16} />} onClick={onOpenSettings}>
            Dispositivos e áudio
          </ItemNav>
          <ItemNav icon={<UserIcon size={16} />} onClick={onOpenConta}>
            Minha conta
          </ItemNav>
          {/* Sair da página encerraria a sessão ao vivo: durante ela, a ajuda abre em outra aba. */}
          <Link
            href="/ajuda"
            target={connected ? "_blank" : undefined}
            className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-white/4 hover:text-fg"
          >
            <HelpIcon size={16} />
            Ajuda e acessibilidade
            {connected && <span className="sr-only">(abre em nova aba)</span>}
          </Link>
        </nav>
      </div>

      {/* O histórico ocupa o espaço que sobra e rola sozinho; o resto fica fixo. */}
      <div className="mx-3 mt-4 border-t border-line" />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-4">
        <Grupo titulo="Histórico">
          <ListaHistorico {...historico} />
        </Grupo>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 px-3 pb-3">
        <Capacidades connected={connected} />
        <div className="rounded-xl border border-line bg-white/2 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
              Seu plano
            </p>
            <SeloPlano resumo={resumo} />
          </div>
          <MedidorCreditos resumo={resumo} compacto />
          {resumo.limiteCreditos !== null && (
            <p className="mt-1.5 text-[11px] text-subtle">Renova em {renovacao(resumo)}</p>
          )}
          <button
            type="button"
            onClick={onVerPlanos}
            className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line text-xs font-medium text-fg transition-colors hover:border-line-strong hover:bg-white/5"
          >
            {resumo.admin ? <ShieldCheckIcon size={13} /> : <SparklesIcon size={13} className="text-accent" />}
            {resumo.admin ? "Administração" : "Ver planos"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-line p-2">
        <button
          type="button"
          onClick={onOpenConta}
          title="Minha conta"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-white/5"
        >
          <Avatar nome={usuario.nome} size={34} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">{usuario.nome}</span>
            <span className="block truncate text-xs text-muted">{usuario.email}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onSair}
          disabled={saindo}
          aria-label="Sair da conta"
          title="Sair da conta"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/6 hover:text-fg disabled:opacity-50"
        >
          <LogOutIcon size={16} />
        </button>
      </div>
    </aside>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function ItemNav({
  ativo,
  icon,
  onClick,
  children,
}: {
  ativo?: boolean;
  icon: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativo ? "page" : undefined}
      className={`relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors ${
        ativo ? "bg-white/6 font-medium text-fg" : "text-muted hover:bg-white/4 hover:text-fg"
      }`}
    >
      {ativo && (
        <span aria-hidden className="ai-gradient absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full" />
      )}
      <span className={ativo ? "text-accent" : ""}>{icon}</span>
      {children}
    </button>
  );
}

function Capacidades({ connected }: { connected: boolean }) {
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  const voz: [string, Tom] = !connected
    ? ["Inativa", "off"]
    : isMicrophoneEnabled
      ? ["Ouvindo você", "on"]
      : ["Microfone mudo", "warn"];

  const visao: [string, Tom] = !connected
    ? ["Inativa", "off"]
    : isScreenShareEnabled
      ? ["Vendo sua tela", "on"]
      : isCameraEnabled
        ? ["Vendo a câmera", "on"]
        : ["Desligada", "off"];

  // Linha compacta: o espaço vertical do menu fica para o histórico. O estado de cada
  // capacidade aparece no ponto colorido e, por extenso, no tooltip e no leitor de tela.
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white/2 py-2 pl-3.5 pr-2">
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">Capacidades</h2>
      <ul className="flex items-center gap-1">
        <Capacidade icon={<MicIcon size={14} />} nome="Voz" estado={voz} />
        <Capacidade icon={<ScanEyeIcon size={14} />} nome="Visão" estado={visao} />
        {/* A memória é por conta (Mem0) e vale entre sessões, conectado ou não. */}
        <Capacidade icon={<BrainIcon size={14} />} nome="Memória" estado={["Persistente", "on"]} />
      </ul>
    </div>
  );
}

function Capacidade({ icon, nome, estado }: { icon: ReactNode; nome: string; estado: [string, Tom] }) {
  const [texto, tom] = estado;
  const rotulo = `${nome}: ${texto}`;
  return (
    <li
      title={rotulo}
      aria-label={rotulo}
      className={`relative flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white/3 ${
        tom === "off" ? "text-subtle" : "text-fg"
      }`}
    >
      {icon}
      <span
        aria-hidden
        className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar ${COR_TOM[tom]}`}
      />
    </li>
  );
}
