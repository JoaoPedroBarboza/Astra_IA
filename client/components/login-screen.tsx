"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AstraOrb } from "./astra-orb";

// Protótipo: a checagem é no cliente e as credenciais ficam visíveis no bundle.
// Isto NÃO é autenticação — serve só para demonstrar o fluxo completo.
const EMAIL = "admin@astraia.com";
const SENHA = "admin@123";

export function LoginScreen({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function submeter(e: FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === EMAIL && senha === SENHA) {
      setErro(null);
      onEntrar();
      return;
    }
    setErro("E-mail ou senha inválidos.");
  }

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
            <h2 className="text-lg font-medium text-foreground">Acessar o sistema</h2>
            <p className="text-sm text-(--astra-text-dim)">
              Entre com suas credenciais para iniciar uma sessão.
            </p>
          </div>

          <form onSubmit={submeter} className="flex flex-col gap-4" noValidate>
            <Campo
              id="email"
              rotulo="E-mail"
              tipo="email"
              valor={email}
              aoMudar={setEmail}
              placeholder="nome@astraia.com"
              autoComplete="username"
            />
            <Campo
              id="senha"
              rotulo="Senha"
              tipo="password"
              valor={senha}
              aoMudar={setSenha}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {erro && (
              <p
                role="alert"
                className="astra-scale-in rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              className="mt-1 rounded-full bg-(--astra-blue) px-6 py-3 text-sm font-medium text-white shadow-[0_0_28px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-(--astra-blue-light) hover:shadow-[0_0_38px_rgba(96,165,250,0.45)]"
            >
              Entrar
            </button>
          </form>

          <p className="mt-6 border-t border-white/6 pt-5 text-center text-[11px] tracking-wide text-(--astra-text-dimmer)">
            ASTRA IA • PROTÓTIPO v1.0.0
          </p>
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
}: {
  id: string;
  rotulo: string;
  tipo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder: string;
  autoComplete: string;
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
        className="rounded-lg border border-white/8 bg-white/4 px-3.5 py-2.5 text-sm text-foreground placeholder:text-(--astra-text-dimmer) outline-none transition-colors focus:border-(--astra-blue-light) focus:bg-white/6"
      />
    </label>
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
