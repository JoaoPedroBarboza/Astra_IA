"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { traduzirErro } from "@/lib/erros-auth";
import { AstraOrb } from "./astra-orb";
import { Wordmark } from "./brand";
import {
  AlertIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BrainIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  MicIcon,
  ScanEyeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SpinnerIcon,
  UserIcon,
} from "./icons";

type Modo = "entrar" | "cadastrar" | "verificar" | "recuperar" | "redefinir";

const ESPERA_REENVIO_S = 60;
const SENHA_MINIMA = 8;

export function LoginScreen({
  googleHabilitado,
  erroInicial,
}: {
  googleHabilitado: boolean;
  erroInicial: string | null;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(erroInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [reenvioEm, setReenvioEm] = useState(0);

  useEffect(() => {
    if (reenvioEm <= 0) return;
    const timer = setTimeout(() => setReenvioEm((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [reenvioEm]);

  function irPara(proximo: Modo, mensagem: string | null = null) {
    setModo(proximo);
    setErro(null);
    setAviso(mensagem);
    setCodigo("");
  }

  function aguardarCodigo(proximo: Modo, mensagem: string | null = null) {
    setReenvioEm(ESPERA_REENVIO_S);
    irPara(proximo, mensagem);
  }

  // Cada ação devolve true quando a sessão foi criada e a página vai trocar —
  // aí o botão continua desabilitado até a navegação terminar.
  const acoes: Record<Modo, () => Promise<boolean>> = {
    async entrar() {
      const { error } = await authClient.signIn.email({ email, password: senha });
      if (!error) return true;
      if (error.code === "EMAIL_NOT_VERIFIED") {
        await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
        aguardarCodigo("verificar", "Seu e-mail ainda não foi confirmado. Enviamos um novo código.");
        return false;
      }
      setErro(traduzirErro(error));
      return false;
    },

    async cadastrar() {
      if (!nome.trim()) {
        setErro("Informe seu nome.");
        return false;
      }
      const { error } = await authClient.signUp.email({ name: nome.trim(), email, password: senha });
      if (error) {
        setErro(traduzirErro(error));
        return false;
      }
      aguardarCodigo("verificar");
      return false;
    },

    async verificar() {
      const { data, error } = await authClient.emailOtp.verifyEmail({ email, otp: codigo });
      if (error) {
        setErro(traduzirErro(error));
        return false;
      }
      if (data?.token) return true;
      irPara("entrar", "E-mail confirmado. Entre com sua senha.");
      return false;
    },

    async recuperar() {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email });
      if (error) {
        setErro(traduzirErro(error));
        return false;
      }
      setSenha("");
      aguardarCodigo("redefinir");
      return false;
    },

    async redefinir() {
      const { error } = await authClient.emailOtp.resetPassword({ email, otp: codigo, password: senha });
      if (error) {
        setErro(traduzirErro(error));
        return false;
      }
      setSenha("");
      irPara("entrar", "Senha redefinida. Entre com a nova senha.");
      return false;
    },
  };

  async function submeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    const entrou = await acoes[modo]().catch(() => {
      setErro("Sem conexão com o servidor. Tente novamente.");
      return false;
    });
    if (entrou) {
      router.replace("/");
      router.refresh();
      return;
    }
    setCarregando(false);
  }

  async function reenviarCodigo() {
    setErro(null);
    const { error } =
      modo === "redefinir"
        ? await authClient.emailOtp.requestPasswordReset({ email })
        : await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error) {
      setErro(traduzirErro(error));
      return;
    }
    setReenvioEm(ESPERA_REENVIO_S);
    setAviso("Enviamos um novo código.");
  }

  async function entrarComGoogle() {
    setErro(null);
    setCarregando(true);
    // Em caso de sucesso o navegador é redirecionado para o Google; o retorno com
    // falha volta para /login?error=..., tratado na página.
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login",
    });
    if (error) {
      setErro(traduzirErro(error));
      setCarregando(false);
    }
  }

  const cabecalho: Record<Modo, { titulo: string; subtitulo: ReactNode; icone?: ReactNode }> = {
    entrar: {
      titulo: "Bem-vindo de volta",
      subtitulo: "Entre na sua conta para iniciar uma sessão com a Astra.",
    },
    cadastrar: {
      titulo: "Crie sua conta",
      subtitulo: "Cadastre-se para conversar com a Astra por voz e visão.",
    },
    verificar: {
      titulo: "Confirme seu e-mail",
      icone: <MailIcon size={20} />,
      subtitulo: (
        <>
          Digite o código de 6 dígitos enviado para <span className="font-medium text-fg">{email}</span>.
        </>
      ),
    },
    recuperar: {
      titulo: "Recuperar senha",
      icone: <LockIcon size={20} />,
      subtitulo: "Informe seu e-mail para receber um código de redefinição.",
    },
    redefinir: {
      titulo: "Defina uma nova senha",
      icone: <LockIcon size={20} />,
      subtitulo: (
        <>
          Se houver uma conta para <span className="font-medium text-fg">{email}</span>, enviamos um
          código. Digite-o junto com a nova senha.
        </>
      ),
    },
  };

  const rotuloBotao: Record<Modo, [string, string]> = {
    entrar: ["Entrar", "Entrando…"],
    cadastrar: ["Criar conta", "Criando conta…"],
    verificar: ["Confirmar e-mail", "Confirmando…"],
    recuperar: ["Enviar código", "Enviando…"],
    redefinir: ["Redefinir senha", "Salvando…"],
  };

  const pedeCodigo = modo === "verificar" || modo === "redefinir";
  const ehAcesso = modo === "entrar" || modo === "cadastrar";
  const { titulo, subtitulo, icone } = cabecalho[modo];

  return (
    <div className="relative flex min-h-screen lg:h-dvh lg:min-h-0">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(60%_100%_at_20%_0%,rgb(124_140_255/0.12),transparent)] lg:hidden"
      />

      {/* Formulário */}
      <section className="relative flex w-full flex-col px-6 py-6 sm:px-10 lg:w-[min(36rem,46%)] lg:shrink-0 lg:overflow-y-auto lg:py-8">
        <header>
          <Wordmark />
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div key={modo} className="w-full max-w-100 animate-fade-up">
            {!ehAcesso && (
              <button
                type="button"
                onClick={() => irPara("entrar")}
                className="mb-8 flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-fg"
              >
                <ArrowLeftIcon size={14} />
                Voltar para o login
              </button>
            )}

            {icone && (
              <span className="ring-gradient mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                {icone}
              </span>
            )}

            <div className="mb-7 space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-fg">{titulo}</h1>
              <p className="text-sm leading-relaxed text-muted">{subtitulo}</p>
            </div>

            {ehAcesso && (
              <div className="mb-6 grid grid-cols-2 rounded-xl border border-line bg-white/3 p-1">
                {(
                  [
                    ["entrar", "Entrar"],
                    ["cadastrar", "Criar conta"],
                  ] as const
                ).map(([m, rotulo]) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={modo === m}
                    onClick={() => modo !== m && irPara(m)}
                    className={`h-9 rounded-lg text-sm font-medium transition-all ${
                      modo === m
                        ? "bg-white/8 text-fg shadow-[0_1px_2px_rgb(0_0_0/0.4)] ring-1 ring-line-strong"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}

            {googleHabilitado && ehAcesso && (
              <>
                <button
                  type="button"
                  onClick={entrarComGoogle}
                  disabled={carregando}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-line bg-white/3 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <GoogleIcon />
                  Continuar com Google
                </button>
                <div className="my-6 flex items-center gap-3 text-xs text-subtle">
                  <span className="h-px flex-1 bg-line" />
                  ou continue com e-mail
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form onSubmit={submeter} className="flex flex-col gap-4" noValidate>
              {modo === "cadastrar" && (
                <Campo
                  id="nome"
                  rotulo="Nome"
                  tipo="text"
                  valor={nome}
                  aoMudar={setNome}
                  placeholder="Como a Astra deve te chamar"
                  autoComplete="name"
                  icone={<UserIcon size={16} />}
                />
              )}

              {!pedeCodigo && (
                <Campo
                  id="email"
                  rotulo="E-mail"
                  tipo="email"
                  valor={email}
                  aoMudar={setEmail}
                  placeholder="nome@empresa.com"
                  autoComplete="email"
                  icone={<MailIcon size={16} />}
                />
              )}

              {pedeCodigo && (
                <CampoCodigo valor={codigo} aoMudar={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 6))} />
              )}

              {(modo === "entrar" || modo === "cadastrar" || modo === "redefinir") && (
                <Campo
                  id="senha"
                  rotulo={modo === "redefinir" ? "Nova senha" : "Senha"}
                  tipo="password"
                  valor={senha}
                  aoMudar={setSenha}
                  placeholder={modo === "entrar" ? "Sua senha" : `Mínimo de ${SENHA_MINIMA} caracteres`}
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  icone={<LockIcon size={16} />}
                  extraRotulo={
                    modo === "entrar" && (
                      <LinkAcao onClick={() => irPara("recuperar")}>Esqueci minha senha</LinkAcao>
                    )
                  }
                  ajuda={
                    modo !== "entrar" && (
                      <p
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          senha.length >= SENHA_MINIMA ? "text-ok" : "text-subtle"
                        }`}
                      >
                        <CheckIcon size={13} strokeWidth={2.4} />
                        Pelo menos {SENHA_MINIMA} caracteres
                      </p>
                    )
                  }
                />
              )}

              {erro && (
                <p
                  role="alert"
                  className="flex animate-scale-in items-start gap-2 rounded-xl border border-bad/25 bg-bad/10 px-3.5 py-2.5 text-sm text-bad"
                >
                  <AlertIcon size={16} className="mt-0.5 shrink-0" />
                  {erro}
                </p>
              )}

              {aviso && (
                <p
                  role="status"
                  className="flex animate-scale-in items-start gap-2 rounded-xl border border-accent/25 bg-accent/10 px-3.5 py-2.5 text-sm text-fg"
                >
                  <InfoIcon size={16} className="mt-0.5 shrink-0 text-accent" />
                  {aviso}
                </p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="btn-primary group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {carregando && <SpinnerIcon size={16} />}
                {rotuloBotao[modo][carregando ? 1 : 0]}
                {!carregando && (
                  <ArrowRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </form>

            {pedeCodigo && (
              <p className="mt-6 text-center text-xs text-muted">
                Não recebeu?{" "}
                <LinkAcao onClick={reenviarCodigo} disabled={reenvioEm > 0}>
                  {reenvioEm > 0 ? `Reenviar código em ${reenvioEm}s` : "Reenviar código"}
                </LinkAcao>
              </p>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-4 text-xs text-subtle">
          <span className="flex items-center gap-3">
            © Astra IA
            <Link href="/ajuda" className="rounded underline-offset-2 transition-colors hover:text-fg hover:underline">
              Central de ajuda
            </Link>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheckIcon size={13} />
            Conexão criptografada
          </span>
        </footer>
      </section>

      {/* Vitrine */}
      <Vitrine />
    </div>
  );
}

function Vitrine() {
  return (
    <section className="relative hidden flex-1 p-3 pl-0 lg:flex">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-3xl border border-line bg-panel">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-grid absolute inset-0" />
          <div className="absolute left-1/2 top-[38%] h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(124_140_255/0.16),transparent_60%)]" />
          <div className="absolute -left-24 -top-24 h-112 w-112 animate-aurora rounded-full bg-accent-violet/12 blur-3xl" />
          <div className="absolute -bottom-32 -right-16 h-112 w-112 animate-aurora rounded-full bg-accent-cyan/10 blur-3xl [animation-delay:-9s]" />
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10 [@media(max-height:820px)]:gap-6">
          <span className="ring-gradient flex items-center gap-2 rounded-full bg-white/4 px-3.5 py-1.5 text-xs font-medium text-fg">
            <SparklesIcon size={14} className="text-accent-violet" />
            IA multimodal em tempo real
          </span>

          <AstraOrb state="idle" size="md" />

          <div className="max-w-xl space-y-4 text-center">
            <h2 className="text-4xl font-semibold leading-[1.1] tracking-tight text-fg [@media(max-height:820px)]:text-3xl">
              Uma assistente que <span className="ai-gradient-text">ouve, enxerga e lembra</span>.
            </h2>
            <p className="text-base leading-relaxed text-muted">
              Converse por voz em tempo real, mostre sua câmera ou sua tela e continue de onde
              parou: a Astra guarda o contexto entre as conversas.
            </p>
          </div>

          <ul className="grid w-full max-w-3xl grid-cols-3 gap-3">
            <Recurso icone={<MicIcon size={17} />} titulo="Voz em tempo real" texto="Conversa natural, com respostas faladas na hora." />
            <Recurso icone={<ScanEyeIcon size={17} />} titulo="Visão computacional" texto="Analisa a câmera ou a tela que você compartilhar." />
            <Recurso icone={<BrainIcon size={17} />} titulo="Memória contínua" texto="Lembra preferências e contexto entre sessões." />
          </ul>
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-line bg-black/20 px-8 py-4 text-xs text-muted">
          <Selo icone={<ShieldCheckIcon size={14} />}>Conexão criptografada</Selo>
          <Selo icone={<LockIcon size={14} />}>Memória isolada por conta</Selo>
          <Selo icone={<MailIcon size={14} />}>Acesso com e-mail verificado</Selo>
        </div>
      </div>
    </section>
  );
}

function Recurso({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <li className="rounded-2xl border border-line bg-white/3 p-4 backdrop-blur-sm">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
        {icone}
      </span>
      <p className="text-sm font-medium text-fg">{titulo}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{texto}</p>
    </li>
  );
}

function Selo({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-accent">{icone}</span>
      {children}
    </span>
  );
}

function Campo({
  id,
  rotulo,
  tipo,
  valor,
  aoMudar,
  placeholder,
  autoComplete,
  icone,
  extraRotulo,
  ajuda,
}: {
  id: string;
  rotulo: string;
  tipo: "text" | "email" | "password";
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  icone: ReactNode;
  extraRotulo?: ReactNode;
  ajuda?: ReactNode;
}) {
  const [visivel, setVisivel] = useState(false);
  const ehSenha = tipo === "password";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-fg">
          {rotulo}
        </label>
        {extraRotulo}
      </div>
      <div className="group relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle transition-colors group-focus-within:text-accent">
          {icone}
        </span>
        <input
          id={id}
          type={ehSenha && visivel ? "text" : tipo}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`h-11 w-full rounded-xl border border-line bg-white/3 pl-10 text-sm text-fg outline-none transition placeholder:text-subtle hover:border-line-strong focus:border-accent/60 focus:bg-white/5 focus:ring-4 focus:ring-accent/15 ${
            ehSenha ? "pr-11" : "pr-3.5"
          }`}
        />
        {ehSenha && (
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={visivel}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-white/6 hover:text-fg"
          >
            {visivel ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        )}
      </div>
      {ajuda}
    </div>
  );
}

/**
 * Seis caixas por cima de um único input invisível: colar o código, o preenchimento
 * automático do SMS/e-mail (one-time-code) e o teclado numérico do celular continuam
 * funcionando como num campo comum.
 */
function CampoCodigo({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const [foco, setFoco] = useState(false);
  const posicao = Math.min(valor.length, 5);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="codigo" className="text-xs font-medium text-fg">
        Código de verificação
      </label>
      <div className="relative">
        <input
          id="codigo"
          type="text"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          autoComplete="one-time-code"
          inputMode="numeric"
          autoFocus
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div aria-hidden className="grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }, (_, i) => {
            const digito = valor[i];
            const atual = foco && i === posicao;
            return (
              <div
                key={i}
                className={`flex h-13 items-center justify-center rounded-xl border bg-white/3 font-mono text-xl font-medium text-fg transition-all ${
                  atual
                    ? "border-accent/70 ring-4 ring-accent/15"
                    : digito
                      ? "border-line-strong"
                      : "border-line"
                }`}
              >
                {digito ?? (atual ? <span className="h-5 w-px animate-caret bg-fg" /> : null)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LinkAcao({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-medium text-accent transition-colors hover:text-fg disabled:cursor-not-allowed disabled:text-subtle"
    >
      {children}
    </button>
  );
}
