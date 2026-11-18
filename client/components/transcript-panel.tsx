"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  useChat,
  useLocalParticipant,
  useTranscriptions,
  useVoiceAssistant,
} from "@livekit/components-react";
import { formatarDataHora, type MensagemSalva } from "@/lib/conversas";
import { Avatar, AstraMark } from "./brand";
import { AlertIcon, ArrowUpIcon, HistoryIcon, KeyboardIcon, MessageIcon } from "./icons";

type Entry = {
  id: string;
  from: "user" | "astra";
  text: string;
  at: number;
  /** Mensagem enviada pela caixa de texto (e não falada). */
  digitada?: boolean;
};

type Item = { tipo: "fala"; entry: Entry } | { tipo: "divisor"; id: string; rotulo: string; atual?: boolean };

/** Conversa do histórico aberta no painel. */
export type ConversaNoPainel = {
  titulo: string | null;
  /** Falas já gravadas. Durante a sessão, são as das sessões anteriores. */
  salvas: MensagemSalva[];
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
};

const formatoHora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Falas salvas com um divisor (data e hora) no começo de cada sessão. */
function linhaDoTempoSalva(salvas: MensagemSalva[]): Item[] {
  const itens: Item[] = [];
  let sala: string | null = null;
  for (const m of salvas) {
    if (m.sala !== sala) {
      sala = m.sala;
      itens.push({ tipo: "divisor", id: `sessao-${m.sala}`, rotulo: formatarDataHora(m.criadaEm) });
    }
    itens.push({
      tipo: "fala",
      entry: {
        id: m.id,
        from: m.papel === "usuario" ? "user" : "astra",
        text: m.texto,
        at: Date.parse(m.criadaEm),
        digitada: m.digitada,
      },
    });
  }
  return itens;
}

export function TranscriptPanel({
  connected,
  nomeUsuario,
  conversa,
}: {
  connected: boolean;
  nomeUsuario: string;
  conversa: ConversaNoPainel | null;
}) {
  const transcriptions = useTranscriptions();
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const { state: agentState, agent } = useVoiceAssistant();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Falas (transcrição) e mensagens digitadas numa linha do tempo só. O agente recebe o
  // texto pelo tópico lk.chat e responde por voz, e essa resposta já chega aqui como
  // transcrição — por isso só as mensagens locais do chat entram, sem duplicar a Astra.
  const aoVivo = useMemo<Entry[]>(() => {
    if (!connected) return [];
    const localIdentity = localParticipant?.identity;
    const falas: Entry[] = transcriptions.map((t) => ({
      id: t.streamInfo.id,
      from: t.participantInfo.identity === localIdentity ? "user" : "astra",
      text: t.text,
      at: t.streamInfo.timestamp,
    }));
    const digitadas: Entry[] = chatMessages
      .filter((m) => m.from?.isLocal)
      .map((m) => ({ id: m.id, from: "user", text: m.message, at: m.timestamp, digitada: true }));
    return [...falas, ...digitadas].sort((a, b) => a.at - b.at);
  }, [connected, transcriptions, chatMessages, localParticipant?.identity]);

  const salvas = conversa?.salvas;
  const itens = useMemo<Item[]>(() => {
    const anteriores = salvas ? linhaDoTempoSalva(salvas) : [];
    const atuais: Item[] = aoVivo.map((entry) => ({ tipo: "fala", entry }));
    // Ao continuar uma conversa, o que é desta sessão fica separado do que veio antes.
    if (connected && anteriores.length > 0) {
      return [...anteriores, { tipo: "divisor", id: "sessao-atual", rotulo: "Sessão atual", atual: true }, ...atuais];
    }
    return [...anteriores, ...atuais];
  }, [salvas, aoVivo, connected]);

  const totalFalas = itens.filter((i) => i.tipo === "fala").length;
  const pensando = connected && agentState === "thinking";
  const carregando = !connected && !!conversa?.carregando;
  const falhou = !connected && !!conversa?.erro;
  // A transcrição chega em pedaços: rolar também quando a última fala cresce, não só
  // quando entra uma fala nova.
  const ultimo = itens.at(-1);
  const tamanhoUltima = ultimo?.tipo === "fala" ? ultimo.entry.text.length : 0;

  useEffect(() => {
    const el = scrollRef.current;
    // Ao vivo, desliza; ao abrir uma conversa salva, vai direto para o fim.
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: connected ? "smooth" : "auto" });
  }, [itens.length, tamanhoUltima, pensando, connected, conversa?.titulo]);

  // O handler de texto do agente só existe depois que ele entra na sala: antes disso a
  // mensagem se perderia, então a caixa espera por ele.
  const podeEnviar = connected && agent !== undefined;
  const motivo = connected
    ? "Aguardando a Astra entrar na sala…"
    : conversa && totalFalas > 0
      ? "Continue a conversa para responder"
      : "Inicie uma sessão para conversar por texto";

  const vazio = itens.length === 0 && !pensando;

  return (
    <section className="panel flex min-h-96 flex-col overflow-hidden max-lg:max-h-[34rem] lg:min-h-0 lg:flex-1">
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        {conversa?.titulo ? (
          <HistoryIcon size={16} className="shrink-0 text-muted" />
        ) : (
          <MessageIcon size={16} className="shrink-0 text-muted" />
        )}
        <h2 className="min-w-0 truncate text-sm font-medium text-fg" title={conversa?.titulo ?? undefined}>
          {conversa?.titulo ?? "Conversa"}
        </h2>
        {connected && (
          <span className="shrink-0 rounded-full bg-ok/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
            Ao vivo
          </span>
        )}
        {totalFalas > 0 && (
          <span className="ml-auto shrink-0 font-mono text-[11px] text-subtle">
            {totalFalas} {totalFalas === 1 ? "mensagem" : "mensagens"}
          </span>
        )}
      </header>

      <div
        ref={scrollRef}
        aria-live={connected ? "polite" : undefined}
        aria-busy={carregando || undefined}
        className={`scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4 ${
          vazio && !carregando ? "flex items-center justify-center" : "space-y-4"
        }`}
      >
        {carregando && itens.length === 0 ? (
          <Esqueleto />
        ) : falhou ? (
          <ErroAoCarregar onTentarDeNovo={conversa!.onTentarDeNovo} />
        ) : vazio ? (
          <EstadoVazio connected={connected} />
        ) : (
          <>
            {itens.map((item) =>
              item.tipo === "divisor" ? (
                <Divisor key={item.id} rotulo={item.rotulo} atual={item.atual} />
              ) : item.entry.from === "astra" ? (
                <FalaAstra key={item.entry.id} entry={item.entry} />
              ) : (
                <FalaUsuario key={item.entry.id} entry={item.entry} nome={nomeUsuario} />
              ),
            )}
            {pensando && <Pensando />}
          </>
        )}
      </div>

      <CaixaDeTexto habilitada={podeEnviar} motivo={motivo} enviando={isSending} onEnviar={send} />
    </section>
  );
}

function Divisor({ rotulo, atual }: { rotulo: string; atual?: boolean }) {
  return (
    <div role="separator" aria-label={rotulo} className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-line" />
      <span
        className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
          atual ? "text-ok" : "text-subtle"
        }`}
      >
        {atual && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
        {rotulo}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Esqueleto() {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Carregando a conversa…</span>
      {[0.62, 0.8, 0.45, 0.7].map((largura, i) => (
        <div key={i} className={`flex gap-2.5 ${i % 2 ? "" : "flex-row-reverse"}`}>
          <span className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-white/6" />
          <span
            className="h-12 animate-pulse rounded-2xl bg-white/5"
            style={{ width: `${largura * 100}%`, animationDelay: `${i * 0.1}s` }}
          />
        </div>
      ))}
    </div>
  );
}

function ErroAoCarregar({ onTentarDeNovo }: { onTentarDeNovo: () => void }) {
  return (
    <div className="flex max-w-60 flex-col items-center gap-3 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-bad/25 bg-bad/10 text-bad">
        <AlertIcon size={18} />
      </span>
      <p className="text-sm text-fg">Não foi possível carregar esta conversa.</p>
      <button
        type="button"
        onClick={onTentarDeNovo}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-line-strong hover:bg-white/5"
      >
        Tentar de novo
      </button>
    </div>
  );
}

function CaixaDeTexto({
  habilitada,
  motivo,
  enviando,
  onEnviar,
}: {
  habilitada: boolean;
  motivo: string;
  enviando: boolean;
  onEnviar: (texto: string) => Promise<unknown>;
}) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Cresce com o conteúdo até ~5 linhas; depois rola por dentro.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [texto]);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || !habilitada || enviando) return;
    setTexto("");
    setErro(false);
    try {
      await onEnviar(mensagem);
    } catch {
      // Devolve o texto para o usuário não perder o que escreveu.
      setTexto(mensagem);
      setErro(true);
    }
    ref.current?.focus();
  }

  function aoTeclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envia; Shift+Enter quebra linha. isComposing evita enviar no meio de um
    // acento composto (teclados com IME).
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar();
    }
  }

  const vazio = texto.trim().length === 0;

  return (
    <form onSubmit={enviar} className="shrink-0 border-t border-line p-3">
      <div
        className={`flex items-end gap-2 rounded-xl border bg-white/3 py-1.5 pl-3.5 pr-1.5 transition ${
          habilitada
            ? "border-line focus-within:border-accent/60 focus-within:bg-white/5 focus-within:ring-4 focus-within:ring-accent/15"
            : "border-line opacity-70"
        }`}
      >
        <textarea
          ref={ref}
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          disabled={!habilitada}
          placeholder={habilitada ? "Escreva uma mensagem para a Astra…" : motivo}
          aria-label="Mensagem para a Astra"
          className="scroll-thin min-h-9 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-fg outline-none placeholder:text-subtle disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!habilitada || vazio || enviando}
          aria-label="Enviar mensagem"
          className="btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
        >
          <ArrowUpIcon size={16} strokeWidth={2.2} />
        </button>
      </div>
      {erro ? (
        <p role="alert" className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-bad">
          <AlertIcon size={12} />
          Não foi possível enviar. Tente novamente.
        </p>
      ) : (
        habilitada && (
          <p className="mt-2 px-1 text-[11px] text-subtle">
            <kbd className="font-mono">Enter</kbd> envia · <kbd className="font-mono">Shift + Enter</kbd> quebra linha
          </p>
        )
      )}
    </form>
  );
}

function EstadoVazio({ connected }: { connected: boolean }) {
  return (
    <div className="flex max-w-60 flex-col items-center gap-3 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/3 text-muted">
        <MessageIcon size={18} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">
          {connected ? "Fale ou digite para começar" : "Nenhuma conversa ainda"}
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {connected
            ? "A conversa aparece aqui em tempo real, por voz ou por texto."
            : "Inicie uma sessão para conversar por voz ou por texto."}
        </p>
      </div>
    </div>
  );
}

function Hora({ at }: { at: number }) {
  return <time className="font-mono text-[10px] text-subtle">{formatoHora.format(at)}</time>;
}

function FalaAstra({ entry }: { entry: Entry }) {
  return (
    <div className="flex animate-fade-up gap-2.5">
      <AstraMark size={24} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-fg">Astra</span>
          <Hora at={entry.at} />
        </div>
        <p className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-tl-md border border-line bg-white/3 px-3.5 py-2.5 text-sm leading-relaxed text-fg/90">
          {entry.text}
        </p>
      </div>
    </div>
  );
}

function FalaUsuario({ entry, nome }: { entry: Entry; nome: string }) {
  return (
    <div className="flex animate-fade-up flex-row-reverse gap-2.5">
      <Avatar nome={nome} size={24} />
      <div className="flex min-w-0 max-w-[85%] flex-col items-end space-y-1">
        <div className="flex items-baseline gap-2">
          {entry.digitada && (
            <span className="flex items-center gap-1 self-center text-[10px] text-subtle" title="Mensagem digitada">
              <KeyboardIcon size={11} />
              texto
            </span>
          )}
          <Hora at={entry.at} />
          <span className="text-xs font-medium text-fg">Você</span>
        </div>
        <p className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-tr-md bg-accent/14 px-3.5 py-2.5 text-sm leading-relaxed text-fg ring-1 ring-accent/20">
          {entry.text}
        </p>
      </div>
    </div>
  );
}

function Pensando() {
  return (
    <div className="flex animate-fade-up items-center gap-2.5" role="status">
      <AstraMark size={24} className="shrink-0" />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-white/3 px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-dots rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
        <span className="sr-only">Astra está pensando</span>
      </div>
    </div>
  );
}
