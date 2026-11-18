"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@livekit/components-styles";
import { ConnectionQuality, type LocalAudioTrack } from "livekit-client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useConnectionQualityIndicator,
  useLocalParticipant,
  useTrackVolume,
  useVoiceAssistant,
} from "@livekit/components-react";
import { useConnectionDetails } from "@/hooks/use-connection-details";
import { useConversa, useConversas } from "@/hooks/use-conversas";
import { usePlano } from "@/hooks/use-plano";
import { authClient } from "@/lib/auth-client";
import { formatarDataHora, TITULO_PADRAO, type ConversaResumo } from "@/lib/conversas";
import { formatarCreditos, tempoEstimado, type ResumoPlano } from "@/lib/planos";
import { AccountPanel, type AbaConta, type UsuarioConta } from "./account-panel";
import { AppSidebar } from "./app-sidebar";
import { AstraOrb, type AstraOrbState } from "./astra-orb";
import { Avatar, Wordmark } from "./brand";
import { ConnectionStatus, type SessionStatus } from "./connection-status";
import { ControlBar } from "./control-bar";
import { GavetaHistorico, type HistoricoProps } from "./history-list";
import {
  AlertIcon,
  HelpIcon,
  HistoryIcon,
  MicIcon,
  ShieldCheckIcon,
  SignalIcon,
  SlidersIcon,
  SparklesIcon,
  SpinnerIcon,
  SquarePenIcon,
} from "./icons";
import { renovacao } from "./plan-meter";
import { SettingsPanel } from "./settings-panel";
import { TranscriptPanel, type ConversaNoPainel } from "./transcript-panel";
import { VideoPreview } from "./video-preview";
import { VoiceVisualizer } from "./voice-visualizer";

type EstadoVisual = {
  orbState: AstraOrbState;
  label: string;
  subtitle: string;
  /** Cor do indicador do estado. */
  cor: string;
};

function mapAgentState(state: string): EstadoVisual {
  switch (state) {
    case "listening":
      return { orbState: "listening", label: "Ouvindo", subtitle: "Pode falar, estou te escutando", cor: "bg-accent-cyan" };
    case "thinking":
      return { orbState: "thinking", label: "Pensando", subtitle: "Processando o que você disse", cor: "bg-accent-violet" };
    case "speaking":
      return { orbState: "speaking", label: "Falando", subtitle: "A Astra está respondendo", cor: "bg-accent" };
    case "connecting":
    case "initializing":
    case "idle":
    case "pre-connect-buffering":
      return { orbState: "connecting", label: "Conectando", subtitle: "Preparando a sessão", cor: "bg-warn" };
    case "failed":
      return {
        orbState: "connecting",
        label: "Agente indisponível",
        subtitle: "Encerre e inicie uma nova sessão",
        cor: "bg-bad",
      };
    default:
      return { orbState: "connecting", label: "Aguardando o agente", subtitle: "A Astra está entrando na sala", cor: "bg-warn" };
  }
}

export function SessionView({
  usuario: usuarioInicial,
  plano: planoInicial,
  conversas: conversasIniciais,
}: {
  usuario: UsuarioConta;
  plano: ResumoPlano;
  conversas: ConversaResumo[];
}) {
  const router = useRouter();
  const { state, connect, reset } = useConnectionDetails();
  const { resumo, sessoes, recarregar: recarregarPlano } = usePlano(planoInicial);
  const historico = useConversas(conversasIniciais);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contaAba, setContaAba] = useState<AbaConta | null>(null);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [volume, setVolume] = useState(1);
  const [saindo, setSaindo] = useState(false);
  // O nome muda pela tela de conta; manter aqui atualiza o console na hora, sem
  // esperar a página do servidor ser recarregada.
  const [nome, setNome] = useState(usuarioInicial.nome);
  const usuario = { ...usuarioInicial, nome };

  // Sair da página desmonta o LiveKitRoom, que desconecta da sala; o agente então
  // encerra e salva a conversa na memória do usuário.
  async function sair() {
    setSaindo(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  const details = state.status === "ready" ? state.details : undefined;
  const connected = state.status === "ready";
  const status: SessionStatus = connected
    ? "online"
    : state.status === "loading"
      ? "connecting"
      : "offline";

  // Conversa aberta: a escolhida no histórico ou a da sessão em andamento, que continua
  // aberta quando a sessão termina. null = conversa nova.
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const selecionadaRef = useRef(selecionada);
  useEffect(() => {
    selecionadaRef.current = selecionada;
  });
  const conversa = useConversa(selecionada, connected);
  const resumoSelecionada = historico.lista.find((c) => c.id === selecionada) ?? null;
  const tituloAberto = conversa.detalhe?.titulo ?? resumoSelecionada?.titulo ?? null;
  const totalSalvas = conversa.detalhe?.mensagens.length ?? resumoSelecionada?.mensagens ?? 0;
  // Só a lista traz conversas em que o usuário falou; o detalhe é checado direto.
  const usuarioFalou = conversa.detalhe
    ? conversa.detalhe.mensagens.some((m) => m.papel === "usuario")
    : resumoSelecionada !== null;

  const abrirConfig = () => setSettingsOpen(true);
  const abrirConta = () => setContaAba("perfil");
  const verPlanos = () => setContaAba(resumo.admin ? "admin" : "plano");

  // Uma recusa do /api/token (ex.: créditos esgotados) atualiza o saldo exibido.
  const erroAoConectar = state.status === "error";
  useEffect(() => {
    if (erroAoConectar) void recarregarPlano();
  }, [erroAoConectar, recarregarPlano]);

  async function conectar() {
    const novos = await connect(selecionada);
    // Uma conversa nova ganha id no /api/token: ela passa a ser a aberta.
    if (novos) setSelecionada(novos.conversaId);
  }

  // O agente grava a última fala e o título ao encerrar, alguns segundos depois da
  // desconexão: uma segunda leitura busca o que chegou depois da primeira.
  const releituraRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(releituraRef.current), []);

  // Fim de sessão (pelo usuário ou pelo agente ao atingir o limite do plano): volta ao
  // estado inicial e atualiza o saldo com o consumo que acabou de ser registrado.
  function aoDesconectar() {
    reset();
    void recarregarPlano();
    void historico.recarregar();
    const id = selecionadaRef.current;
    clearTimeout(releituraRef.current);
    releituraRef.current = setTimeout(() => {
      void historico.recarregar();
      if (id) void conversa.recarregar(id);
    }, 4000);
  }

  const propsHistorico: HistoricoProps = {
    conversas: historico.lista,
    erro: historico.erro,
    selecionada,
    bloqueado: connected || state.status === "loading",
    onNova: () => {
      setSelecionada(null);
      setGavetaAberta(false);
    },
    onAbrir: (id) => {
      setSelecionada(id);
      setGavetaAberta(false);
    },
    onRenomear: async (id, titulo) => {
      const novo = await historico.renomear(id, titulo);
      conversa.atualizarTitulo(id, novo);
    },
    onApagar: async (id) => {
      await historico.apagar(id);
      setSelecionada((atual) => (atual === id ? null : atual));
    },
    onRecarregar: () => void historico.recarregar(),
  };

  const conversaNoPainel: ConversaNoPainel | null = selecionada
    ? {
        titulo: tituloAberto,
        salvas: conversa.detalhe?.mensagens ?? [],
        carregando: conversa.carregando,
        erro: conversa.erro,
        onTentarDeNovo: () => void conversa.recarregar(selecionada),
      }
    : null;

  // Só oferece "continuar" quando há o que continuar (uma sessão em que o usuário não
  // falou nada não conta).
  const continuar =
    selecionada && usuarioFalou && totalSalvas > 0
      ? {
          titulo: tituloAberto ?? TITULO_PADRAO,
          mensagens: totalSalvas,
          atualizadaEm: conversa.detalhe?.atualizadaEm ?? resumoSelecionada?.atualizadaEm ?? null,
        }
      : null;

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
      onDisconnected={aoDesconectar}
      className="flex min-h-screen lg:h-dvh! lg:min-h-0"
    >
      <RoomAudioRenderer volume={volume} />

      <AppSidebar
        usuario={usuario}
        resumo={resumo}
        connected={connected}
        onOpenSettings={abrirConfig}
        onOpenConta={abrirConta}
        onVerPlanos={verPlanos}
        onSair={sair}
        saindo={saindo}
        historico={propsHistorico}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
          <div className="lg:hidden">
            <Wordmark size={26} />
          </div>
          <nav aria-label="Trilha" className="hidden min-w-0 items-center gap-2 text-sm lg:flex">
            <span className="text-muted">Console</span>
            <span className="text-subtle">/</span>
            {tituloAberto ? (
              <>
                <span className="text-muted">Histórico</span>
                <span className="text-subtle">/</span>
                <span className="truncate font-medium text-fg" title={tituloAberto}>
                  {tituloAberto}
                </span>
              </>
            ) : (
              <span className="font-medium text-fg">{connected ? "Sessão ao vivo" : "Nova conversa"}</span>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <ConnectionStatus status={status} />
            <div className="flex items-center gap-1 lg:hidden">
              <BotaoTopo label="Histórico de conversas" onClick={() => setGavetaAberta(true)}>
                <HistoryIcon size={17} />
              </BotaoTopo>
              <BotaoTopo label="Dispositivos e áudio" onClick={abrirConfig}>
                <SlidersIcon size={17} />
              </BotaoTopo>
              <BotaoTopo label="Minha conta" onClick={abrirConta}>
                <Avatar nome={usuario.nome} size={28} />
              </BotaoTopo>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:min-h-0 lg:flex-row">
          <section className="panel relative flex min-h-[36rem] flex-1 flex-col overflow-hidden lg:min-h-0">
            <FundoDoPalco />

            <div className="relative flex h-12 shrink-0 items-center justify-between px-5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-subtle">
                Agente de voz · Astra
              </span>
              {connected && <QualidadeDaRede />}
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-8">
              {connected ? (
                <PalcoConectado onOpenSettings={abrirConfig} />
              ) : (
                <PalcoInicial
                  nome={usuario.nome}
                  resumo={resumo}
                  continuar={continuar}
                  loading={state.status === "loading"}
                  errorMessage={state.status === "error" ? state.message : null}
                  onConnect={() => void conectar()}
                  onNovaConversa={propsHistorico.onNova}
                  onVerPlanos={verPlanos}
                />
              )}
            </div>
          </section>

          <aside className="flex w-full animate-slide-in flex-col gap-4 lg:min-h-0 lg:w-[22rem] xl:w-96">
            <TranscriptPanel connected={connected} nomeUsuario={usuario.nome} conversa={conversaNoPainel} />
            <VideoPreview />
          </aside>
        </main>
      </div>

      <GavetaHistorico open={gavetaAberta} onClose={() => setGavetaAberta(false)} {...propsHistorico} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        volume={volume}
        onVolumeChange={setVolume}
      />

      <AccountPanel
        aba={contaAba}
        onAbaChange={setContaAba}
        onClose={() => setContaAba(null)}
        usuario={usuario}
        resumo={resumo}
        sessoes={sessoes}
        onRecarregarPlano={recarregarPlano}
        onNomeAtualizado={(novo) => {
          setNome(novo);
          // Atualiza também a página do servidor (o cookie da sessão já traz o nome novo).
          router.refresh();
        }}
        onSair={sair}
        saindo={saindo}
      />
    </LiveKitRoom>
  );
}

function FundoDoPalco() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid absolute inset-0" />
      <div className="absolute left-1/2 top-[44%] h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(124_140_255/0.14),transparent_62%)]" />
      <div className="absolute -left-32 -top-24 h-96 w-96 animate-aurora rounded-full bg-accent-violet/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-96 w-96 animate-aurora rounded-full bg-accent-cyan/8 blur-3xl [animation-delay:-9s]" />
    </div>
  );
}

/**
 * Mede o volume da fonte que importa no momento — a voz da Astra enquanto ela fala, o
 * microfone enquanto ela ouve — e grava num ref que o orbe lê a cada quadro. Fica num
 * componente próprio para o volume (que muda a cada quadro) não re-renderizar o palco.
 */
function PonteDeAudio({ nivelRef }: { nivelRef: RefObject<number> }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { microphoneTrack, isMicrophoneEnabled } = useLocalParticipant();
  const mic = isMicrophoneEnabled ? (microphoneTrack?.track as LocalAudioTrack | undefined) : undefined;
  const fonte = state === "speaking" ? audioTrack : state === "listening" ? mic : undefined;
  const volume = useTrackVolume(fonte);

  useEffect(() => {
    nivelRef.current = fonte ? volume : 0;
  }, [nivelRef, fonte, volume]);

  return null;
}

function PalcoConectado({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { state: agentState } = useVoiceAssistant();
  const { orbState, label, subtitle, cor } = mapAgentState(agentState);
  const nivelRef = useRef(0);

  return (
    <div className="flex animate-fade-up flex-col items-center gap-5">
      <PonteDeAudio nivelRef={nivelRef} />
      <AstraOrb state={orbState} nivelRef={nivelRef} />
      <div className="flex flex-col items-center gap-2.5 text-center">
        <span className="flex items-center gap-2 rounded-full border border-line bg-white/4 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg">
          <span className={`h-1.5 w-1.5 rounded-full ${cor}`} />
          {label}
        </span>
        <p className="text-lg font-medium tracking-tight text-fg">{subtitle}</p>
      </div>
      <VoiceVisualizer />
      <ControlBar onOpenSettings={onOpenSettings} />
    </div>
  );
}

const SUGESTOES = [
  "O que você lembra sobre mim?",
  "Olha minha tela e me ajuda com isso",
  "Me ajuda a organizar meu dia",
];

function PalcoInicial({
  nome,
  resumo,
  continuar,
  loading,
  errorMessage,
  onConnect,
  onNovaConversa,
  onVerPlanos,
}: {
  nome: string;
  resumo: ResumoPlano;
  /** Conversa do histórico aberta, pronta para ser continuada. */
  continuar: { titulo: string; mensagens: number; atualizadaEm: string | null } | null;
  loading: boolean;
  errorMessage: string | null;
  onConnect: () => void;
  onNovaConversa: () => void;
  onVerPlanos: () => void;
}) {
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  const restantes = resumo.restantesCreditos;
  const esgotado = restantes !== null && restantes <= 0;

  return (
    <div className="flex animate-fade-up flex-col items-center gap-6 text-center">
      <AstraOrb state={loading ? "connecting" : "idle"} />

      {continuar && !loading ? (
        <div className="space-y-2.5">
          <span className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-line bg-white/4 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            <HistoryIcon size={12} className="text-accent" />
            Conversa do histórico
          </span>
          <h1 className="mx-auto line-clamp-2 max-w-xl text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {continuar.titulo}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
            {continuar.mensagens} {continuar.mensagens === 1 ? "mensagem" : "mensagens"}
            {continuar.atualizadaEm && <> · última atividade em {formatarDataHora(continuar.atualizadaEm)}</>}.
            Continue de onde parou: a Astra recebe o fim desta conversa como contexto.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {loading ? (
              "Conectando à Astra…"
            ) : (
              <>
                Olá{primeiroNome && ", "}
                <span className="ai-gradient-text">{primeiroNome}</span>. Como posso ajudar?
              </>
            )}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
            Converse por voz em tempo real. Ligue a câmera ou compartilhe a tela para a Astra
            enxergar o que você está vendo.
          </p>
        </div>
      )}

      {esgotado ? (
        <div className="flex max-w-md animate-scale-in flex-col items-center gap-3 rounded-2xl border border-warn/25 bg-warn/8 px-5 py-4">
          <p className="text-sm text-fg">
            Seus créditos deste mês acabaram. Eles renovam em{" "}
            <span className="font-medium">{renovacao(resumo)}</span>.
          </p>
          <button
            type="button"
            onClick={onVerPlanos}
            className="btn-primary flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <SparklesIcon size={15} />
            Ver planos
          </button>
        </div>
      ) : (
        <>
          {errorMessage && (
            <p
              role="alert"
              className="flex max-w-md animate-scale-in items-start gap-2 rounded-xl border border-bad/25 bg-bad/10 px-3.5 py-2.5 text-left text-sm text-bad"
            >
              <AlertIcon size={16} className="mt-0.5 shrink-0" />
              {errorMessage}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onConnect}
                disabled={loading}
                className="btn-primary flex h-12 items-center gap-2.5 rounded-xl px-7 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <SpinnerIcon size={17} /> : <MicIcon size={17} />}
                {loading ? "Conectando…" : continuar ? "Continuar conversa" : "Iniciar sessão"}
              </button>
              {continuar && !loading && (
                <button
                  type="button"
                  onClick={onNovaConversa}
                  className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white/3 px-5 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-white/6"
                >
                  <SquarePenIcon size={16} className="text-accent" />
                  Nova conversa
                </button>
              )}
            </div>
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-subtle">
              <ShieldCheckIcon size={13} />
              Conexão criptografada
              <span aria-hidden>·</span>
              {restantes === null ? (
                "créditos ilimitados"
              ) : (
                <button type="button" onClick={onVerPlanos} className="underline-offset-2 hover:text-fg hover:underline">
                  {formatarCreditos(restantes)} créditos ({tempoEstimado(restantes)})
                </button>
              )}
            </p>
          </div>
        </>
      )}

      {!loading && !esgotado && !continuar && (
        <div className="hidden flex-wrap items-center justify-center gap-2 pt-1 sm:flex">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">Experimente</span>
          {SUGESTOES.map((s) => (
            <span
              key={s}
              className="rounded-full border border-line bg-white/3 px-3 py-1.5 text-xs text-muted"
            >
              “{s}”
            </span>
          ))}
        </div>
      )}

      {!loading && (
        <Link
          href="/ajuda"
          className="flex items-center gap-1.5 rounded-md text-xs text-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
        >
          <HelpIcon size={13} />
          Primeira vez? Veja como usar a Astra
        </Link>
      )}
    </div>
  );
}

const QUALIDADE: Record<ConnectionQuality, { texto: string; cor: string }> = {
  [ConnectionQuality.Excellent]: { texto: "Excelente", cor: "text-ok" },
  [ConnectionQuality.Good]: { texto: "Boa", cor: "text-ok" },
  [ConnectionQuality.Poor]: { texto: "Instável", cor: "text-warn" },
  [ConnectionQuality.Lost]: { texto: "Perdida", cor: "text-bad" },
  [ConnectionQuality.Unknown]: { texto: "Medindo", cor: "text-muted" },
};

function QualidadeDaRede() {
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant });
  const q = QUALIDADE[quality] ?? QUALIDADE[ConnectionQuality.Unknown];

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted" title="Qualidade da conexão">
      <SignalIcon size={13} className={q.cor} />
      Rede: <span className={`font-medium ${q.cor}`}>{q.texto}</span>
    </span>
  );
}

function BotaoTopo({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/6 hover:text-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}
