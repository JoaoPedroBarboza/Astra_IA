"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AstraOrb } from "./astra-orb";

type Modo = "entrar" | "cadastrar" | "verificar" | "recuperar" | "redefinir";

type ErroAuth = { code?: string; status: number };

// Códigos de erro do Better Auth; o que não estiver aqui cai na mensagem genérica,
// já que as mensagens originais vêm em inglês.
const MENSAGENS_DE_ERRO: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha inválidos.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  INVALID_OTP: "Código inválido.",
  OTP_EXPIRED: "O código expirou. Peça um novo.",
  TOO_MANY_ATTEMPTS: "Muitas tentativas com este código. Peça um novo.",
};

function traduzirErro(erro: ErroAuth) {
  if (erro.status === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return (erro.code && MENSAGENS_DE_ERRO[erro.code]) || "Não foi possível concluir. Tente novamente.";
}

const ESPERA_REENVIO_S = 60;

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

  const cabecalho: Record<Modo, { titulo: string; subtitulo: ReactNode }> = {
    entrar: {
      titulo: "Acessar o sistema",
      subtitulo: "Entre com sua conta para iniciar uma sessão.",
    },
    cadastrar: {
      titulo: "Criar conta",
      subtitulo: "Cadastre-se para conversar com a Astra.",
    },
    verificar: {
      titulo: "Confirme seu e-mail",
      subtitulo: (
        <>
          Digite o código de 6 dígitos enviado para{" "}
          <span className="text-foreground">{email}</span>.
        </>
      ),
    },
    recuperar: {
      titulo: "Recuperar senha",
      subtitulo: "Informe seu e-mail para receber um código de redefinição.",
    },
    redefinir: {
      titulo: "Nova senha",
      subtitulo: (
        <>
          Se houver uma conta para <span className="text-foreground">{email}</span>, enviamos um
          código. Digite-o junto com a nova senha.
        </>
      ),
    },
  };

  const rotuloBotao: Record<Modo, [string, string]> = {
    entrar: ["Entrar", "Entrando..."],
    cadastrar: ["Criar conta", "Criando conta..."],
    verificar: ["Confirmar", "Confirmando..."],
    recuperar: ["Enviar código", "Enviando..."],
    redefinir: ["Redefinir senha", "Salvando..."],
  };

  const pedeCodigo = modo === "verificar" || modo === "redefinir";

  return (
    <div className="flex min-h-screen flex-col lg:h-dvh lg:min-h-0 lg:flex-row">
      {/* Lado da marca */}
      <section className="relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden px-8 py-12 lg:px-14">
        <div className="astra-fade-up flex flex-col items-center gap-7">
          <AstraOrb state="idle" />
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Astra IA</h1>
            <p className="max-w-sm text-sm leading-relaxed text-(--astra-text-dim)">
              Assistente corporativa de voz e visão computacional, com memória contínua entre
              conversas.
            </p>
          </div>
        </div>

        <ul className="astra-fade-up flex flex-col gap-3 sm:flex-row sm:gap-6">
          <Pilar icon={<IconeVoz />} titulo="Voz" descricao="Diálogo em tempo real" />
          <Pilar icon={<IconeVisao />} titulo="Visão" descricao="Enxerga sua tela" />
          <Pilar icon={<IconeMemoria />} titulo="Memória" descricao="Lembra do contexto" />
        </ul>
      </section>

      {/* Lado do formulário */}
      <section className="flex w-full items-center justify-center px-6 pb-12 lg:w-120 lg:border-l lg:border-(--astra-border) lg:bg-white/2 lg:px-10 lg:py-12">
        <div className="astra-panel astra-slide-in w-full max-w-sm p-7">
          <div className="mb-7 flex flex-col gap-1.5">
            <h2 className="text-lg font-medium text-foreground">{cabecalho[modo].titulo}</h2>
            <p className="text-sm text-(--astra-text-dim)">{cabecalho[modo].subtitulo}</p>
          </div>

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
              />
            )}

            {pedeCodigo && (
              <Campo
                id="codigo"
                rotulo="Código"
                tipo="text"
                valor={codigo}
                aoMudar={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
              />
            )}

            {(modo === "entrar" || modo === "cadastrar" || modo === "redefinir") && (
              <div className="flex flex-col gap-2">
                <Campo
                  id="senha"
                  rotulo={modo === "redefinir" ? "Nova senha" : "Senha"}
                  tipo="password"
                  valor={senha}
                  aoMudar={setSenha}
                  placeholder={modo === "entrar" ? "••••••••" : "Mínimo de 8 caracteres"}
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                />
                {modo === "entrar" && (
                  <LinkAcao className="self-end" onClick={() => irPara("recuperar")}>
                    Esqueci minha senha
                  </LinkAcao>
                )}
              </div>
            )}

            {erro && (
              <p
                role="alert"
                className="astra-scale-in rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {erro}
              </p>
            )}

            {aviso && (
              <p
                role="status"
                className="astra-scale-in rounded-lg border border-(--astra-border) bg-(--astra-blue)/10 px-3 py-2 text-sm text-(--astra-blue-light)"
              >
                {aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="mt-1 rounded-full bg-(--astra-blue) px-6 py-3 text-sm font-medium text-white shadow-[0_0_28px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-(--astra-blue-light) hover:shadow-[0_0_38px_rgba(96,165,250,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rotuloBotao[modo][carregando ? 1 : 0]}
            </button>
          </form>

          {googleHabilitado && (modo === "entrar" || modo === "cadastrar") && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-(--astra-text-dimmer)">
                <span className="h-px flex-1 bg-white/8" />
                ou
                <span className="h-px flex-1 bg-white/8" />
              </div>
              <button
                type="button"
                onClick={entrarComGoogle}
                disabled={carregando}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/4 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconeGoogle />
                Continuar com Google
              </button>
            </>
          )}

          <div className="mt-6 flex flex-col items-center gap-2 border-t border-white/6 pt-5 text-xs text-(--astra-text-dim)">
            {modo === "entrar" && (
              <p>
                Não tem conta?{" "}
                <LinkAcao onClick={() => irPara("cadastrar")}>Criar conta</LinkAcao>
              </p>
            )}
            {modo === "cadastrar" && (
              <p>
                Já tem conta? <LinkAcao onClick={() => irPara("entrar")}>Entrar</LinkAcao>
              </p>
            )}
            {pedeCodigo && (
              <LinkAcao onClick={reenviarCodigo} disabled={reenvioEm > 0}>
                {reenvioEm > 0 ? `Reenviar código em ${reenvioEm}s` : "Reenviar código"}
              </LinkAcao>
            )}
            {modo !== "entrar" && modo !== "cadastrar" && (
              <LinkAcao onClick={() => irPara("entrar")}>Voltar para o login</LinkAcao>
            )}
          </div>
        </div>
      </section>
    </div>
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
  inputMode,
  autoFocus,
}: {
  id: string;
  rotulo: string;
  tipo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  inputMode?: "numeric";
  autoFocus?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="text-xs font-medium text-(--astra-text-dim)">{rotulo}</span>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className="rounded-lg border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-foreground placeholder:text-(--astra-text-dimmer) outline-none transition-colors focus:border-(--astra-blue-light) focus:bg-white/6"
      />
    </label>
  );
}

function LinkAcao({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-medium text-(--astra-blue-light) transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:text-(--astra-text-dimmer) ${className}`}
    >
      {children}
    </button>
  );
}

function Pilar({
  icon,
  titulo,
  descricao,
}: {
  icon: ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--astra-border) bg-white/4 text-(--astra-blue-light)">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{titulo}</span>
        <span className="text-xs text-(--astra-text-dimmer)">{descricao}</span>
      </span>
    </li>
  );
}

function IconeGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
    </svg>
  );
}

function IconeVoz() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function IconeVisao() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconeMemoria() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
    </svg>
  );
}
