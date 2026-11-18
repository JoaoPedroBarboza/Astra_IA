"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { agruparPorData, TITULO_MAX, type ConversaResumo } from "@/lib/conversas";
import { CloseIcon, HistoryIcon, PencilIcon, SpinnerIcon, SquarePenIcon, TrashIcon } from "./icons";

export type HistoricoProps = {
  conversas: ConversaResumo[];
  erro: boolean;
  /** Conversa aberta (ou a da sessão ao vivo). */
  selecionada: string | null;
  /** Sessão ao vivo: a conversa não pode ser trocada até ela terminar. */
  bloqueado: boolean;
  onNova: () => void;
  onAbrir: (id: string) => void;
  onRenomear: (id: string, titulo: string) => Promise<void>;
  onApagar: (id: string) => Promise<void>;
  onRecarregar: () => void;
};

const MOTIVO_BLOQUEIO = "Encerre a sessão ao vivo para trocar de conversa";

export function BotaoNovaConversa({ onClick, bloqueado }: { onClick: () => void; bloqueado: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={bloqueado}
      title={bloqueado ? MOTIVO_BLOQUEIO : "Começar uma conversa nova"}
      className="flex h-9 w-full items-center gap-2.5 rounded-lg border border-line bg-white/3 px-2.5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <SquarePenIcon size={15} className="text-accent" />
      Nova conversa
    </button>
  );
}

export function ListaHistorico({
  conversas,
  erro,
  selecionada,
  bloqueado,
  onAbrir,
  onRenomear,
  onApagar,
  onRecarregar,
}: Omit<HistoricoProps, "onNova">) {
  const grupos = useMemo(() => agruparPorData(conversas), [conversas]);
  // Uma conversa nova só entra na lista depois da primeira fala gravada; durante a
  // sessão ela aparece como "ao vivo" no topo.
  const aoVivoForaDaLista = bloqueado && selecionada !== null && !conversas.some((c) => c.id === selecionada);

  if (conversas.length === 0 && !aoVivoForaDaLista) {
    return erro ? (
      <p className="px-2 text-xs leading-relaxed text-muted">
        Não foi possível carregar o histórico.{" "}
        <button type="button" onClick={onRecarregar} className="text-fg underline underline-offset-2">
          Tentar de novo
        </button>
      </p>
    ) : (
      <p className="px-2 text-xs leading-relaxed text-subtle">
        Suas conversas aparecem aqui. Abra uma para rever ou continuar de onde parou.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {aoVivoForaDaLista && (
        <div className="flex flex-col gap-0.5">
          <RotuloGrupo>Agora</RotuloGrupo>
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/6 px-2.5 text-sm text-fg">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ok" />
            <span className="truncate">Conversa atual</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ok">Ao vivo</span>
          </div>
        </div>
      )}
      {grupos.map((g) => (
        <div key={g.rotulo} className="flex flex-col gap-0.5">
          <RotuloGrupo>{g.rotulo}</RotuloGrupo>
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((c) => (
              <li key={c.id}>
                <ItemConversa
                  conversa={c}
                  ativa={c.id === selecionada}
                  aoVivo={bloqueado && c.id === selecionada}
                  bloqueado={bloqueado}
                  onAbrir={onAbrir}
                  onRenomear={onRenomear}
                  onApagar={onApagar}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RotuloGrupo({ children }: { children: string }) {
  return <h3 className="px-2.5 pb-1 text-[11px] font-medium text-subtle">{children}</h3>;
}

function ItemConversa({
  conversa,
  ativa,
  aoVivo,
  bloqueado,
  onAbrir,
  onRenomear,
  onApagar,
}: {
  conversa: ConversaResumo;
  ativa: boolean;
  aoVivo: boolean;
  bloqueado: boolean;
  onAbrir: (id: string) => void;
  onRenomear: (id: string, titulo: string) => Promise<void>;
  onApagar: (id: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<"normal" | "renomeando" | "apagando">("normal");
  const [ocupado, setOcupado] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    setFalhou(false);
    try {
      await acao();
      setModo("normal");
    } catch {
      setFalhou(true);
    } finally {
      setOcupado(false);
    }
  }

  if (modo === "renomeando") {
    return (
      <FormRenomear
        inicial={conversa.titulo}
        ocupado={ocupado}
        falhou={falhou}
        onSalvar={(titulo) =>
          titulo === conversa.titulo ? setModo("normal") : void executar(() => onRenomear(conversa.id, titulo))
        }
        onCancelar={() => {
          setFalhou(false);
          setModo("normal");
        }}
      />
    );
  }

  if (modo === "apagando") {
    return (
      <div role="group" aria-label={`Apagar "${conversa.titulo}"?`} className="rounded-lg bg-bad/8 p-2 ring-1 ring-bad/25">
        <p className="truncate px-0.5 text-xs text-fg">
          {falhou ? "Não foi possível apagar." : "Apagar esta conversa?"}
        </p>
        <div className="mt-1.5 flex gap-1">
          <button
            type="button"
            autoFocus
            disabled={ocupado}
            onClick={() => void executar(() => onApagar(conversa.id))}
            className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-bad/15 text-xs font-medium text-bad transition-colors hover:bg-bad/25 disabled:opacity-60"
          >
            {ocupado ? <SpinnerIcon size={12} /> : <TrashIcon size={12} />}
            Apagar
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              setFalhou(false);
              setModo("normal");
            }}
            className="h-7 flex-1 rounded-md text-xs text-muted transition-colors hover:bg-white/6 hover:text-fg"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  const travado = bloqueado && !ativa;

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onAbrir(conversa.id)}
        disabled={travado}
        aria-current={ativa ? "page" : undefined}
        title={travado ? MOTIVO_BLOQUEIO : conversa.titulo}
        className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed ${
          ativa ? "bg-white/6 text-fg" : "text-muted enabled:hover:bg-white/4 enabled:hover:text-fg disabled:opacity-50"
        } ${bloqueado ? "" : "group-hover:pr-16 group-focus-within:pr-16"} ${ativa && !bloqueado ? "pr-16" : ""}`}
      >
        {aoVivo && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-ok" />}
        <span className="truncate">{conversa.titulo}</span>
      </button>

      {/* Ações: no hover/foco e sempre na conversa aberta (no toque não existe hover). */}
      {!bloqueado && (
        <div
          className={`absolute inset-y-0 right-1 items-center gap-0.5 ${
            ativa ? "flex" : "hidden group-hover:flex group-focus-within:flex"
          }`}
        >
          <BotaoAcao rotulo={`Renomear "${conversa.titulo}"`} onClick={() => setModo("renomeando")}>
            <PencilIcon size={13} />
          </BotaoAcao>
          <BotaoAcao rotulo={`Apagar "${conversa.titulo}"`} perigo onClick={() => setModo("apagando")}>
            <TrashIcon size={13} />
          </BotaoAcao>
        </div>
      )}
    </div>
  );
}

function BotaoAcao({
  rotulo,
  perigo,
  onClick,
  children,
}: {
  rotulo: string;
  perigo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-white/8 ${
        perigo ? "hover:text-bad" : "hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function FormRenomear({
  inicial,
  ocupado,
  falhou,
  onSalvar,
  onCancelar,
}: {
  inicial: string;
  ocupado: boolean;
  falhou: boolean;
  onSalvar: (titulo: string) => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(inicial);
  const ref = useRef<HTMLInputElement>(null);
  // Enter desabilita o campo enquanto salva, e isso dispara blur — que salvaria de novo.
  // Esc também desmonta o campo com blur. A trava garante uma única decisão; uma falha
  // libera para tentar outra vez.
  const decidido = useRef(false);

  useEffect(() => {
    ref.current?.select();
  }, []);

  useEffect(() => {
    if (falhou) decidido.current = false;
  }, [falhou]);

  function salvar(e?: FormEvent) {
    e?.preventDefault();
    if (decidido.current) return;
    decidido.current = true;
    const limpo = titulo.replace(/\s+/g, " ").trim();
    if (!limpo) return onCancelar();
    onSalvar(limpo);
  }

  function cancelar() {
    if (decidido.current) return;
    decidido.current = true;
    onCancelar();
  }

  return (
    <form onSubmit={salvar}>
      <div className="flex h-9 items-center gap-1 rounded-lg bg-white/6 pl-2 pr-1 ring-1 ring-accent/50">
        <input
          ref={ref}
          value={titulo}
          maxLength={TITULO_MAX}
          disabled={ocupado}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancelar();
            }
          }}
          onBlur={() => salvar()}
          aria-label="Novo título da conversa"
          className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none"
        />
        {ocupado && <SpinnerIcon size={13} className="text-muted" />}
      </div>
      {falhou && <p className="mt-1 px-1 text-[11px] text-bad">Não foi possível renomear.</p>}
    </form>
  );
}

/** Histórico em gaveta lateral, para telas sem o menu lateral (mobile). */
export function GavetaHistorico({
  open,
  onClose,
  ...props
}: HistoricoProps & { open: boolean; onClose: () => void }) {
  const painelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    painelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      anterior?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar histórico"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={painelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-historico"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] animate-slide-in flex-col border-r border-line bg-sidebar shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] outline-none"
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
          <HistoryIcon size={17} className="text-accent" />
          <h2 id="titulo-historico" className="flex-1 text-sm font-semibold text-fg">
            Histórico
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/8 hover:text-fg"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="shrink-0 px-3 pt-3">
          <BotaoNovaConversa onClick={props.onNova} bloqueado={props.bloqueado} />
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <ListaHistorico {...props} />
        </div>
      </div>
    </div>
  );
}
