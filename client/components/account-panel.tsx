"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PainelAdmin, UsuarioAdmin } from "@/app/api/admin/usuarios/route";
import type { SessaoRecente } from "@/app/api/conta/uso/route";
import { authClient } from "@/lib/auth-client";
import { traduzirErro } from "@/lib/erros-auth";
import {
  formatarCreditos,
  formatarPreco,
  PLANOS,
  PLANOS_A_VENDA,
  tempoEstimado,
  USD_POR_CREDITO,
  type PlanoId,
  type ResumoPlano,
} from "@/lib/planos";
import { Avatar } from "./brand";
import {
  AlertIcon,
  AudioLinesIcon,
  BadgeCheckIcon,
  BuildingIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  LogOutIcon,
  MonitorIcon,
  PlugIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  SpinnerIcon,
  UserIcon,
} from "./icons";
import { MedidorCreditos, renovacao, SeloPlano } from "./plan-meter";

export type UsuarioConta = {
  nome: string;
  email: string;
  emailVerificado: boolean;
  /** ISO 8601. */
  criadoEm: string;
};

export type AbaConta = "perfil" | "plano" | "seguranca" | "sistemas" | "admin";
type Provedores = string[] | null | "erro";

function nomeProvedor(p: string) {
  return p === "google" ? "Google" : p === "credential" ? "E-mail e senha" : p;
}

const ABAS: { id: AbaConta; rotulo: string; descricao: string; icone: ReactNode; soAdmin?: boolean }[] = [
  { id: "perfil", rotulo: "Perfil", descricao: "Seus dados e como a Astra te chama.", icone: <UserIcon size={16} /> },
  { id: "plano", rotulo: "Plano e uso", descricao: "Seu plano, seus créditos e o consumo do mês.", icone: <SparklesIcon size={16} /> },
  { id: "seguranca", rotulo: "Segurança", descricao: "Senha e dispositivos conectados à sua conta.", icone: <ShieldCheckIcon size={16} /> },
  { id: "sistemas", rotulo: "Sistemas corporativos", descricao: "Conecte a Astra às ferramentas da sua empresa.", icone: <BuildingIcon size={16} /> },
  { id: "admin", rotulo: "Administração", descricao: "Usuários, planos e consumo da API no mês.", icone: <LockIcon size={16} />, soAdmin: true },
];

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const formatoDataHora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export function AccountPanel({
  aba,
  onAbaChange,
  onClose,
  usuario,
  resumo,
  sessoes,
  onRecarregarPlano,
  onNomeAtualizado,
  onSair,
  saindo,
}: {
  /** Aba aberta; null = painel fechado. */
  aba: AbaConta | null;
  onAbaChange: (aba: AbaConta) => void;
  onClose: () => void;
  usuario: UsuarioConta;
  resumo: ResumoPlano;
  sessoes: SessaoRecente[] | "erro" | null;
  onRecarregarPlano: () => void;
  onNomeAtualizado: (nome: string) => void;
  onSair: () => void;
  saindo: boolean;
}) {
  const open = aba !== null;
  const abas = ABAS.filter((a) => !a.soAdmin || resumo.admin);
  // null = carregando; "erro" = a consulta falhou (não dá para afirmar nada sobre a conta).
  const [provedores, setProvedores] = useState<Provedores>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Em ref pelo mesmo motivo do painel de configurações: o pai recria a função a cada render.
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
      anterior?.focus?.();
    };
  }, [open]);

  // Provedores de login (credential = e-mail e senha, google...): decidem os selos do
  // perfil e se a conta tem senha para trocar.
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    authClient.listAccounts().then(({ data, error }) => {
      if (vivo) setProvedores(error || !data ? "erro" : data.map((c) => c.providerId));
    });
    return () => {
      vivo = false;
    };
  }, [open]);

  if (!open) return null;

  const atual = abas.find((a) => a.id === aba) ?? abas[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar minha conta"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/65 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-conta"
        className="panel relative flex h-dvh w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-none! bg-panel! shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] outline-none sm:h-[min(44rem,92dvh)] sm:flex-row sm:rounded-2xl!"
      >
        {/* Navegação lateral (vira abas horizontais no celular) */}
        <nav aria-label="Seções da conta" className="flex shrink-0 flex-col border-b border-line bg-white/[0.015] sm:w-64 sm:border-b-0 sm:border-r">
          <div className="hidden items-center gap-3 border-b border-line p-5 sm:flex">
            <Avatar nome={usuario.nome} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">{usuario.nome}</p>
              <p className="truncate text-xs text-muted">{usuario.email}</p>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto p-2 sm:flex-col sm:p-3">
            <p className="hidden px-2.5 pb-1 pt-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-subtle sm:block">
              Minha conta
            </p>
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onAbaChange(a.id)}
                aria-current={atual.id === a.id ? "page" : undefined}
                className={`flex h-9 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 text-sm transition-colors ${
                  atual.id === a.id ? "bg-white/7 font-medium text-fg" : "text-muted hover:bg-white/4 hover:text-fg"
                }`}
              >
                <span className={atual.id === a.id ? "text-accent" : ""}>{a.icone}</span>
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-auto hidden border-t border-line p-3 sm:block">
            <button
              type="button"
              onClick={onSair}
              disabled={saindo}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-bad/10 hover:text-bad disabled:opacity-50"
            >
              <LogOutIcon size={16} />
              Sair da conta
            </button>
          </div>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
            <div>
              <h2 id="titulo-conta" className="text-base font-semibold text-fg">
                {atual.rotulo}
              </h2>
              <p className="mt-0.5 text-xs text-muted">{atual.descricao}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/8 hover:text-fg"
            >
              <CloseIcon size={16} />
            </button>
          </header>

          <div key={atual.id} className="scroll-thin min-h-0 flex-1 animate-fade-in overflow-y-auto px-5 py-6 sm:px-7">
            {atual.id === "perfil" && (
              <AbaPerfil
                usuario={usuario}
                provedores={provedores}
                onNomeAtualizado={onNomeAtualizado}
                onSair={onSair}
                saindo={saindo}
              />
            )}
            {atual.id === "plano" && (
              <AbaPlano resumo={resumo} sessoes={sessoes} onRecarregar={onRecarregarPlano} />
            )}
            {atual.id === "seguranca" && <AbaSeguranca provedores={provedores} onSair={onSair} />}
            {atual.id === "sistemas" && <AbaSistemas />}
            {atual.id === "admin" && resumo.admin && <AbaAdmin />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Perfil ───────────────────────────────────────────────────────────────

function AbaPerfil({
  usuario,
  provedores,
  onNomeAtualizado,
  onSair,
  saindo,
}: {
  usuario: UsuarioConta;
  provedores: Provedores;
  onNomeAtualizado: (nome: string) => void;
  onSair: () => void;
  saindo: boolean;
}) {
  const lista = Array.isArray(provedores) ? provedores : [];
  const [nome, setNome] = useState(usuario.nome);
  const [salvando, setSalvando] = useState(false);
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const alterado = nome.trim().length > 0 && nome.trim() !== usuario.nome;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!alterado) return;
    setSalvando(true);
    setRetorno(null);
    const { error } = await authClient.updateUser({ name: nome.trim() });
    setSalvando(false);
    if (error) {
      setRetorno({ tipo: "erro", texto: traduzirErro(error) });
      return;
    }
    setNome(nome.trim());
    setRetorno({ tipo: "ok", texto: "Perfil atualizado. A Astra usará o novo nome na próxima sessão." });
    onNomeAtualizado(nome.trim());
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-white/2 p-5">
        <div aria-hidden className="ai-gradient pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-15 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <Avatar nome={usuario.nome} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-fg">{usuario.nome}</p>
            <p className="truncate text-sm text-muted">{usuario.email}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {usuario.emailVerificado && (
                <Selo tom="ok" icone={<BadgeCheckIcon size={12} />}>
                  E-mail verificado
                </Selo>
              )}
              {lista.map((p) => (
                <Selo key={p} icone={p === "google" ? undefined : <KeyIcon size={12} />}>
                  {p === "google" ? "Login com Google" : nomeProvedor(p)}
                </Selo>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Secao titulo="Informações pessoais" descricao="O nome aparece no console e é como a Astra se dirige a você.">
        <form onSubmit={salvar} className="space-y-4">
          <CampoTexto id="conta-nome" rotulo="Nome completo" valor={nome} aoMudar={setNome} autoComplete="name" />
          <div className="space-y-2">
            <span className="text-xs font-medium text-fg">E-mail</span>
            <div className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-white/[0.015] px-3.5 text-sm text-muted">
              <LockIcon size={15} className="text-subtle" />
              <span className="truncate">{usuario.email}</span>
            </div>
            <p className="text-xs text-subtle">Usado para entrar na conta. Não pode ser alterado por aqui.</p>
          </div>
          <RodapeForm retorno={retorno}>
            <BotaoPrimario disabled={!alterado || salvando} carregando={salvando}>
              Salvar alterações
            </BotaoPrimario>
          </RodapeForm>
        </form>
      </Secao>

      <Secao titulo="Detalhes da conta">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
          <Detalhe rotulo="Membro desde" valor={formatoData.format(new Date(usuario.criadoEm))} />
          <Detalhe
            rotulo="Método de acesso"
            valor={provedores === null ? "…" : lista.map(nomeProvedor).join(" · ") || "—"}
          />
          <Detalhe rotulo="Idioma da assistente" valor="Português (Brasil)" />
          <Detalhe rotulo="Memória" valor="Persistente e isolada por conta" />
        </dl>
      </Secao>

      <div className="border-t border-line pt-6 sm:hidden">
        <button
          type="button"
          onClick={onSair}
          disabled={saindo}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-bad/25 bg-bad/10 text-sm font-medium text-bad disabled:opacity-50"
        >
          <LogOutIcon size={16} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}

// ── Segurança ────────────────────────────────────────────────────────────

type Sessao = NonNullable<Awaited<ReturnType<typeof authClient.listSessions>>["data"]>[number];
type EstadoSessoes = "carregando" | "ok" | "antiga" | "erro";

function AbaSeguranca({ provedores, onSair }: { provedores: Provedores; onSair: () => void }) {
  const temSenha = Array.isArray(provedores) && provedores.includes("credential");
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [atualId, setAtualId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSessoes>("carregando");
  const [versao, setVersao] = useState(0);
  const [encerrando, setEncerrando] = useState<string | null>(null);

  const recarregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    let vivo = true;
    Promise.all([authClient.listSessions(), authClient.getSession()]).then(([lista, atual]) => {
      if (!vivo) return;
      const idAtual = atual.data?.session.id ?? null;
      setAtualId(idAtual);
      if (lista.error) {
        // A listagem exige um login recente (freshAge do Better Auth, 1 dia por padrão).
        setEstado(lista.error.code === "SESSION_NOT_FRESH" ? "antiga" : "erro");
        return;
      }
      const ordenadas = [...(lista.data ?? [])].sort((a, b) =>
        a.id === idAtual ? -1 : b.id === idAtual ? 1 : +new Date(b.createdAt) - +new Date(a.createdAt),
      );
      setSessoes(ordenadas);
      setEstado("ok");
    });
    return () => {
      vivo = false;
    };
  }, [versao]);

  async function encerrar(token: string) {
    setEncerrando(token);
    await authClient.revokeSession({ token });
    setEncerrando(null);
    recarregar();
  }

  async function encerrarOutras() {
    setEncerrando("outras");
    await authClient.revokeOtherSessions();
    setEncerrando(null);
    recarregar();
  }

  return (
    <div className="space-y-8">
      <Secao titulo="Senha" descricao="Use uma senha forte e exclusiva para esta conta.">
        {provedores === null ? (
          <Carregando />
        ) : provedores === "erro" ? (
          <Aviso tom="erro" icone={<AlertIcon size={16} />}>
            Não foi possível verificar o método de acesso da conta. Tente novamente em instantes.
          </Aviso>
        ) : temSenha ? (
          <FormSenha onSenhaAlterada={recarregar} />
        ) : (
          <Aviso icone={<InfoIcon size={16} />}>
            Sua conta entra pelo Google, então não há senha para alterar aqui. A segurança do acesso
            é gerenciada pela sua conta Google.
          </Aviso>
        )}
      </Secao>

      <Secao
        titulo="Sessões ativas"
        descricao="Dispositivos com acesso à sua conta agora. Encerre os que você não reconhecer."
        acao={
          estado === "ok" && sessoes.length > 1 ? (
            <button
              type="button"
              onClick={encerrarOutras}
              disabled={encerrando !== null}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:border-bad/40 hover:bg-bad/10 hover:text-bad disabled:opacity-50"
            >
              Encerrar as outras
            </button>
          ) : null
        }
      >
        {estado === "carregando" && <Carregando />}
        {estado === "erro" && (
          <Aviso tom="erro" icone={<AlertIcon size={16} />}>
            Não foi possível carregar as sessões. Tente novamente em instantes.
          </Aviso>
        )}
        {estado === "antiga" && (
          <Aviso icone={<ShieldCheckIcon size={16} />}>
            <span>
              Por segurança, a lista de dispositivos só fica disponível nas primeiras 24 horas após o
              login.{" "}
              <button type="button" onClick={onSair} className="font-medium text-accent hover:text-fg">
                Entrar novamente
              </button>
            </span>
          </Aviso>
        )}
        {estado === "ok" && (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {sessoes.map((s) => (
              <LinhaSessao
                key={s.id}
                sessao={s}
                atual={s.id === atualId}
                encerrando={encerrando === s.token}
                bloqueado={encerrando !== null}
                onEncerrar={() => encerrar(s.token)}
              />
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

function FormSenha({ onSenhaAlterada }: { onSenhaAlterada: () => void }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [encerrarOutras, setEncerrarOutras] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const valido = atual.length > 0 && nova.length >= 8;

  async function trocar(e: FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setSalvando(true);
    setRetorno(null);
    const { error } = await authClient.changePassword({
      currentPassword: atual,
      newPassword: nova,
      revokeOtherSessions: encerrarOutras,
    });
    setSalvando(false);
    if (error) {
      setRetorno({ tipo: "erro", texto: traduzirErro(error) });
      return;
    }
    setAtual("");
    setNova("");
    setRetorno({
      tipo: "ok",
      texto: encerrarOutras ? "Senha alterada. Os outros dispositivos foram desconectados." : "Senha alterada.",
    });
    onSenhaAlterada();
  }

  return (
    <form onSubmit={trocar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          id="senha-atual"
          rotulo="Senha atual"
          tipo="password"
          valor={atual}
          aoMudar={setAtual}
          autoComplete="current-password"
        />
        <CampoTexto
          id="senha-nova"
          rotulo="Nova senha"
          tipo="password"
          valor={nova}
          aoMudar={setNova}
          autoComplete="new-password"
          ajuda={
            <span className={`flex items-center gap-1.5 ${nova.length >= 8 ? "text-ok" : "text-subtle"}`}>
              <CheckIcon size={12} strokeWidth={2.4} />
              Pelo menos 8 caracteres
            </span>
          }
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          checked={encerrarOutras}
          onChange={(e) => setEncerrarOutras(e.target.checked)}
          className="h-4 w-4 rounded accent-accent"
        />
        Desconectar os outros dispositivos
      </label>
      <RodapeForm retorno={retorno}>
        <BotaoPrimario disabled={!valido || salvando} carregando={salvando}>
          Alterar senha
        </BotaoPrimario>
      </RodapeForm>
    </form>
  );
}

function descreverDispositivo(ua?: string | null) {
  if (!ua) return { nome: "Dispositivo desconhecido", movel: false };
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  const sistema = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return { nome: sistema ? `${navegador} no ${sistema}` : navegador, movel: /Mobile|Android|iPhone|iPad/.test(ua) };
}

function descreverIp(ip?: string | null) {
  if (!ip) return null;
  if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") return "Rede local";
  return `IP ${ip}`;
}

function LinhaSessao({
  sessao,
  atual,
  encerrando,
  bloqueado,
  onEncerrar,
}: {
  sessao: Sessao;
  atual: boolean;
  encerrando: boolean;
  bloqueado: boolean;
  onEncerrar: () => void;
}) {
  const { nome, movel } = descreverDispositivo(sessao.userAgent);
  const ip = descreverIp(sessao.ipAddress);

  return (
    <li className="flex items-center gap-3.5 bg-white/[0.015] px-4 py-3.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          atual ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-white/3 text-muted"
        }`}
      >
        {movel ? <SmartphoneIcon size={16} /> : <MonitorIcon size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
          {nome}
          {atual && (
            <span className="rounded-full bg-ok/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ok">
              Este dispositivo
            </span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {ip && <span>{ip}</span>}
          {ip && <span className="text-subtle">·</span>}
          <span className="flex items-center gap-1">
            <ClockIcon size={11} />
            Desde {formatoDataHora.format(new Date(sessao.createdAt))}
          </span>
        </p>
      </div>
      {!atual && (
        <button
          type="button"
          onClick={onEncerrar}
          disabled={bloqueado}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted transition-colors hover:bg-bad/10 hover:text-bad disabled:opacity-50"
        >
          {encerrando && <SpinnerIcon size={12} />}
          Encerrar
        </button>
      )}
    </li>
  );
}

// ── Sistemas corporativos ───────────────────────────────────────────────

type Sistema = { nome: string; sigla: string; cor: string; descricao: string };

// Catálogo planejado. Nenhum conector existe ainda no backend, por isso todos aparecem
// como "Em breve" e o botão fica desabilitado — a tela não promete o que não faz.
const SISTEMAS: { grupo: string; itens: Sistema[] }[] = [
  {
    grupo: "Produtividade e comunicação",
    itens: [
      { nome: "Microsoft 365", sigla: "M", cor: "#3b8de6", descricao: "Outlook, Teams, OneDrive e SharePoint." },
      { nome: "Google Workspace", sigla: "G", cor: "#34a853", descricao: "Gmail, Agenda, Drive e Meet." },
      { nome: "Slack", sigla: "S", cor: "#e2457a", descricao: "Canais, mensagens diretas e lembretes." },
    ],
  },
  {
    grupo: "Projetos e conhecimento",
    itens: [
      { nome: "Jira", sigla: "J", cor: "#3d8bff", descricao: "Tickets, sprints e status das entregas." },
      { nome: "Notion", sigla: "N", cor: "#d4d4d8", descricao: "Páginas, wikis e bases de conhecimento." },
    ],
  },
  {
    grupo: "CRM e ERP",
    itens: [
      { nome: "Salesforce", sigla: "SF", cor: "#1ab0e8", descricao: "Contas, oportunidades e pipeline de vendas." },
      { nome: "HubSpot", sigla: "H", cor: "#ff7a59", descricao: "Contatos, negócios e campanhas." },
      { nome: "SAP", sigla: "SAP", cor: "#2a7de1", descricao: "Pedidos, estoque e financeiro." },
      { nome: "TOTVS", sigla: "T", cor: "#22b8a7", descricao: "Gestão empresarial, fiscal e RH." },
    ],
  },
];

const TOTAL_SISTEMAS = SISTEMAS.reduce((n, g) => n + g.itens.length, 0);

function AbaSistemas() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-white/2 p-5">
        <div aria-hidden className="ai-gradient pointer-events-none absolute -left-16 -top-24 h-48 w-48 rounded-full opacity-15 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <span className="ring-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <PlugIcon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              0 de {TOTAL_SISTEMAS} sistemas conectados
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Com as integrações, a Astra poderá consultar agendas, e-mails, tickets e dados de
              clientes, e agir nessas ferramentas sempre com a sua permissão. Os conectores estão em
              desenvolvimento e serão liberados em breve.
            </p>
          </div>
        </div>
      </section>

      {SISTEMAS.map((g) => (
        <Secao key={g.grupo} titulo={g.grupo}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.itens.map((s) => (
              <CartaoSistema key={s.nome} sistema={s} />
            ))}
          </ul>
        </Secao>
      ))}
    </div>
  );
}

function CartaoSistema({ sistema }: { sistema: Sistema }) {
  return (
    <li className="flex flex-col gap-4 rounded-xl border border-line bg-white/2 p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-tight"
          style={{
            background: `${sistema.cor}1f`,
            color: sistema.cor,
            boxShadow: `inset 0 0 0 1px ${sistema.cor}40`,
          }}
        >
          {sistema.sigla}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{sistema.nome}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{sistema.descricao}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-subtle">
          Em breve
        </span>
        <button
          type="button"
          disabled
          title="Integração ainda não disponível"
          className="cursor-not-allowed rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-subtle"
        >
          Conectar
        </button>
      </div>
    </li>
  );
}

// ── Plano e uso ──────────────────────────────────────────────────────────

const formatoSessao = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatarDuracao(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m} min ${r.toString().padStart(2, "0")} s` : `${r} s`;
}

function formatarCreditosSessao(c: number) {
  return c > 0 && c < 1 ? "<1" : formatarCreditos(c);
}

function AbaPlano({
  resumo,
  sessoes,
  onRecarregar,
}: {
  resumo: ResumoPlano;
  sessoes: SessaoRecente[] | "erro" | null;
  onRecarregar: () => void;
}) {
  // Saldo e sessões sempre frescos ao abrir a aba.
  useEffect(() => {
    onRecarregar();
  }, [onRecarregar]);

  const plano = PLANOS[resumo.plano];
  const restantes = resumo.restantesCreditos;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-white/2 p-5">
        <div aria-hidden className="ai-gradient pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <SeloPlano resumo={resumo} tamanho="md" />
              <span className="text-xs text-muted">{plano.categoria}</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-fg">
              {restantes === null ? "Ilimitado" : formatarCreditos(restantes)}
              {restantes !== null && <span className="ml-2 text-sm font-normal text-muted">créditos restantes</span>}
            </p>
            <p className="mt-1 text-xs text-muted">
              {restantes === null
                ? `${formatarCreditos(resumo.usadosCreditos)} créditos usados este mês`
                : `${restantes > 0 ? `${tempoEstimado(restantes)} de conversa · ` : ""}renova em ${renovacao(resumo)}`}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <dt className="text-subtle">Créditos por mês</dt>
            <dd className="text-right font-medium text-fg">
              {plano.creditosMensais === null ? "Ilimitados" : formatarCreditos(plano.creditosMensais)}
            </dd>
            <dt className="text-subtle">Sessão máxima</dt>
            <dd className="text-right font-medium text-fg">
              {plano.duracaoMaxMin === null ? "Sem limite" : `${plano.duracaoMaxMin} min`}
            </dd>
          </dl>
        </div>
        <div className="relative mt-5">
          <MedidorCreditos resumo={resumo} />
        </div>
      </section>

      <Aviso icone={<InfoIcon size={16} />}>
        1 crédito equivale a US$ {USD_POR_CREDITO.toFixed(2).replace(".", ",")} de uso da IA. O consumo
        depende do tempo de conversa, de quanto a Astra fala e do uso de câmera ou tela. Se o saldo
        acabar, a sessão é encerrada, e os créditos voltam no início de cada mês.
      </Aviso>

      <Secao titulo="Sessões deste mês">
        {sessoes === null ? (
          <Carregando />
        ) : sessoes === "erro" ? (
          <Aviso tom="erro" icone={<AlertIcon size={16} />}>
            Não foi possível carregar as sessões. Tente novamente em instantes.
          </Aviso>
        ) : sessoes.length === 0 ? (
          <p className="rounded-xl border border-line bg-white/[0.015] px-4 py-3 text-sm text-muted">
            Nenhuma sessão neste mês ainda.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {sessoes.map((s) => (
              <li key={s.sala} className="flex items-center gap-3.5 bg-white/[0.015] px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/3 text-muted">
                  <AudioLinesIcon size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{formatoSessao.format(new Date(s.iniciadaEm))}</p>
                  <p className="text-xs text-muted">
                    {formatarDuracao(s.duracaoS)}
                    {s.motivoEncerramento &&
                      ` · encerrada por ${s.motivoEncerramento === "creditos" ? "fim dos créditos" : "tempo máximo"}`}
                  </p>
                </div>
                <span className="font-mono text-sm tabular-nums text-fg">
                  {formatarCreditosSessao(s.creditos)} <span className="text-xs text-muted">créd.</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Planos" descricao="Escolha o plano que acompanha o seu ritmo de uso.">
        <ul className="grid gap-3 pt-2 md:grid-cols-3">
          {PLANOS_A_VENDA.map((p) => (
            <CartaoPlano key={p.id} planoId={p.id} atual={p.id === resumo.plano} />
          ))}
        </ul>
        <p className="text-xs text-subtle">
          O pagamento online ainda não está disponível. Por enquanto, a troca de plano é feita pela
          administração do sistema.
        </p>
      </Secao>
    </div>
  );
}

function CartaoPlano({ planoId, atual }: { planoId: PlanoId; atual: boolean }) {
  const plano = PLANOS[planoId];
  const creditos = plano.creditosMensais ?? 0;
  const preco = plano.precoMensalBRL ?? 0;

  return (
    <li
      className={`relative flex flex-col rounded-2xl p-4 ${
        plano.destaque ? "ring-gradient bg-accent/6" : "border border-line bg-white/2"
      } ${atual ? "outline-2 outline-offset-2 outline-accent/40" : ""}`}
    >
      {plano.destaque && (
        <span className="ai-gradient absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          Recomendado
        </span>
      )}
      <p className="text-sm font-semibold text-fg">{plano.nome}</p>
      <p className="text-xs text-muted">
        {plano.categoria} · {plano.resumo}
      </p>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-fg">
        {preco === 0 ? "Grátis" : formatarPreco(preco)}
        {preco > 0 && <span className="ml-1 text-xs font-normal text-muted">/mês</span>}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-xs text-muted">
        <ItemPlano>
          <span className="font-medium text-fg">{formatarCreditos(creditos)} créditos</span> por mês (
          {tempoEstimado(creditos)})
        </ItemPlano>
        {plano.duracaoMaxMin !== null && <ItemPlano>Sessões de até {plano.duracaoMaxMin} min</ItemPlano>}
        {plano.extras.map((e) => (
          <ItemPlano key={e}>{e}</ItemPlano>
        ))}
      </ul>
      <button
        type="button"
        disabled
        className={`mt-5 h-9 w-full cursor-not-allowed rounded-lg text-xs font-medium ${
          atual ? "bg-white/8 text-fg" : "border border-line text-subtle"
        }`}
      >
        {atual ? "Seu plano atual" : preco === 0 ? "Plano gratuito" : "Assinar · em breve"}
      </button>
    </li>
  );
}

function ItemPlano({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon size={13} strokeWidth={2.4} className="mt-0.5 shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}

// ── Administração ────────────────────────────────────────────────────────

const formatoUsd = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
const formatoDataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

function formatarHoras(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.round((segundos % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function AbaAdmin() {
  const [painel, setPainel] = useState<PainelAdmin | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let vivo = true;
    fetch("/api/admin/usuarios", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((dados: PainelAdmin) => {
        if (!vivo) return;
        setPainel(dados);
        setErro(null);
      })
      .catch(() => {
        if (vivo) setErro("Não foi possível carregar o painel de administração.");
      });
    return () => {
      vivo = false;
    };
  }, [versao]);

  async function trocarPlano(u: UsuarioAdmin, plano: PlanoId) {
    setSalvando(u.id);
    setErro(null);
    const r = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plano }),
    }).catch(() => null);
    setSalvando(null);
    if (r?.ok) {
      setPainel((p) => p && { ...p, usuarios: p.usuarios.map((x) => (x.id === u.id ? { ...x, plano } : x)) });
      return;
    }
    const corpo = await r?.json().catch(() => null);
    setErro(corpo?.error ?? "Não foi possível trocar o plano.");
    setVersao((v) => v + 1);
  }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = painel?.usuarios ?? [];
    return termo ? lista.filter((u) => `${u.nome} ${u.email}`.toLowerCase().includes(termo)) : lista;
  }, [painel, busca]);

  if (!painel) {
    return erro ? (
      <Aviso tom="erro" icone={<AlertIcon size={16} />}>
        {erro}
      </Aviso>
    ) : (
      <Carregando />
    );
  }

  const { totais } = painel;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Usuários" valor={totais.usuarios.toLocaleString("pt-BR")} />
        <Indicador rotulo="Sessões no mês" valor={totais.sessoesNoMes.toLocaleString("pt-BR")} />
        <Indicador rotulo="Conversa no mês" valor={formatarHoras(totais.duracaoNoMesS)} />
        <Indicador rotulo="Custo de IA no mês" valor={formatoUsd.format(totais.custoNoMesUsd)} destaque />
      </section>

      {erro && (
        <Aviso tom="erro" icone={<AlertIcon size={16} />}>
          {erro}
        </Aviso>
      )}

      <Secao
        titulo="Usuários"
        descricao="A troca de plano vale na hora, inclusive para sessões em andamento."
        acao={
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome ou e-mail"
            aria-label="Buscar usuário"
            className="h-8 w-44 rounded-lg border border-line bg-white/3 px-3 text-xs text-fg outline-none placeholder:text-subtle focus:border-accent/60 sm:w-56"
          />
        }
      >
        {filtrados.length === 0 ? (
          <p className="rounded-xl border border-line bg-white/[0.015] px-4 py-3 text-sm text-muted">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {filtrados.map((u) => (
              <LinhaUsuarioAdmin
                key={u.id}
                usuario={u}
                salvando={salvando === u.id}
                onTrocarPlano={(p) => trocarPlano(u, p)}
              />
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

function LinhaUsuarioAdmin({
  usuario: u,
  salvando,
  onTrocarPlano,
}: {
  usuario: UsuarioAdmin;
  salvando: boolean;
  onTrocarPlano: (plano: PlanoId) => void;
}) {
  const limite = PLANOS[u.plano].creditosMensais;
  const fracao = limite ? Math.min(1, u.creditosNoMes / limite) : 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-white/[0.015] px-4 py-3.5">
      <div className="flex min-w-40 flex-1 items-center gap-3">
        <Avatar nome={u.nome} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{u.nome}</p>
          <p className="truncate text-xs text-muted">{u.email}</p>
        </div>
      </div>

      <div className="w-44 space-y-1">
        <p className="text-xs text-muted">
          <span className="font-medium text-fg">{formatarCreditos(u.creditosNoMes)}</span>
          {limite !== null ? ` de ${formatarCreditos(limite)}` : ""} créditos
        </p>
        <div className="h-1 overflow-hidden rounded-full bg-white/6">
          <div
            className={`h-full rounded-full ${limite === null ? "ai-gradient w-full opacity-60" : fracao >= 1 ? "bg-bad" : fracao >= 0.8 ? "bg-warn" : "ai-gradient"}`}
            style={limite === null ? undefined : { width: `${fracao * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-subtle">
          {u.ultimaSessao
            ? `${u.sessoesNoMes} ${u.sessoesNoMes === 1 ? "sessão" : "sessões"} · última ${formatoDataCurta.format(new Date(u.ultimaSessao))}`
            : "Sem sessões no mês"}
        </p>
      </div>

      <div className="flex w-36 items-center gap-2">
        <select
          value={u.plano}
          onChange={(e) => onTrocarPlano(e.target.value as PlanoId)}
          disabled={u.adminFixo || salvando}
          aria-label={`Plano de ${u.nome}`}
          title={u.adminFixo ? "Administrador definido por ADMIN_EMAILS" : undefined}
          className="astra-select h-9 w-full rounded-lg border border-line bg-white/3 pl-3 pr-8 text-xs text-fg outline-none transition-colors hover:border-line-strong focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {(Object.keys(PLANOS) as PlanoId[]).map((id) => (
            <option key={id} value={id}>
              {PLANOS[id].nome}
            </option>
          ))}
        </select>
        {salvando && <SpinnerIcon size={14} className="shrink-0 text-muted" />}
      </div>
    </li>
  );
}

function Indicador({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${destaque ? "ring-gradient bg-accent/6" : "border border-line bg-white/2"}`}>
      <p className="text-[11px] text-subtle">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-fg">{valor}</p>
    </div>
  );
}

// ── Peças compartilhadas ─────────────────────────────────────────────────

type Retorno = { tipo: "ok" | "erro"; texto: string };

function Secao({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-fg">{titulo}</h3>
          {descricao && <p className="mt-0.5 text-xs text-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function CampoTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  autoComplete,
  tipo = "text",
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  autoComplete: string;
  tipo?: "text" | "password";
  ajuda?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-fg">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-line bg-white/3 px-3.5 text-sm text-fg outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-accent/60 focus:bg-white/5 focus:ring-4 focus:ring-accent/15"
      />
      {ajuda && <p className="text-xs">{ajuda}</p>}
    </div>
  );
}

function RodapeForm({ retorno, children }: { retorno: Retorno | null; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
      {retorno && (
        <p
          role={retorno.tipo === "erro" ? "alert" : "status"}
          className={`flex animate-scale-in items-center gap-1.5 text-xs sm:mr-auto ${
            retorno.tipo === "ok" ? "text-ok" : "text-bad"
          }`}
        >
          {retorno.tipo === "ok" ? <CheckIcon size={13} strokeWidth={2.4} /> : <AlertIcon size={13} />}
          {retorno.texto}
        </p>
      )}
      {children}
    </div>
  );
}

function BotaoPrimario({
  disabled,
  carregando,
  children,
}: {
  disabled: boolean;
  carregando: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="btn-primary flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      {carregando && <SpinnerIcon size={15} />}
      {children}
    </button>
  );
}

function Selo({ tom, icone, children }: { tom?: "ok"; icone?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        tom === "ok" ? "bg-ok/12 text-ok" : "bg-white/6 text-muted"
      }`}
    >
      {icone}
      {children}
    </span>
  );
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-[11px] text-subtle">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-fg">{valor}</dd>
    </div>
  );
}

function Aviso({ tom, icone, children }: { tom?: "erro"; icone: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        tom === "erro" ? "border-bad/25 bg-bad/10 text-bad" : "border-line bg-white/2 text-muted"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${tom === "erro" ? "" : "text-accent"}`}>{icone}</span>
      {children}
    </div>
  );
}

function Carregando() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-white/2 px-4 py-3 text-sm text-muted">
      <SpinnerIcon size={14} />
      Carregando…
    </div>
  );
}
