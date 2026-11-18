import { formatarCreditos, PLANOS, tempoEstimado, type ResumoPlano } from "@/lib/planos";

const formatoRenovacao = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

export function renovacao(resumo: ResumoPlano) {
  return formatoRenovacao.format(new Date(resumo.renovaEm)).replace(".", "");
}

/** Selo com o nome do plano; o Núcleo (administrador) leva o gradiente da marca. */
export function SeloPlano({ resumo, tamanho = "sm" }: { resumo: Pick<ResumoPlano, "plano">; tamanho?: "sm" | "md" }) {
  const plano = PLANOS[resumo.plano];
  const base = tamanho === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  if (plano.id === "nucleo") {
    return (
      <span className={`ai-gradient rounded-full font-semibold uppercase tracking-wider text-white ${base}`}>
        {plano.nome}
      </span>
    );
  }
  return (
    <span
      className={`rounded-full font-semibold uppercase tracking-wider ring-1 ${base} ${
        plano.id === "orbita" ? "bg-white/5 text-muted ring-line" : "bg-accent/12 text-accent ring-accent/25"
      }`}
    >
      {plano.nome}
    </span>
  );
}

/** Barra de consumo do mês. Muda de cor perto do fim do saldo. */
export function MedidorCreditos({ resumo, compacto = false }: { resumo: ResumoPlano; compacto?: boolean }) {
  if (resumo.limiteCreditos === null) {
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
          <div className="ai-gradient h-full w-full opacity-70" />
        </div>
        <p className="text-[11px] text-muted">
          Créditos ilimitados · {formatarCreditos(resumo.usadosCreditos)} usados este mês
        </p>
      </div>
    );
  }

  const fracao = Math.min(1, resumo.usadosCreditos / resumo.limiteCreditos);
  const restantes = resumo.restantesCreditos ?? 0;
  const cor = fracao >= 1 ? "bg-bad" : fracao >= 0.8 ? "bg-warn" : "ai-gradient";

  return (
    <div className="space-y-1.5">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/6"
        role="meter"
        aria-label="Créditos usados no mês"
        aria-valuemin={0}
        aria-valuemax={resumo.limiteCreditos}
        aria-valuenow={Math.round(resumo.usadosCreditos)}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${cor}`} style={{ width: `${fracao * 100}%` }} />
      </div>
      <p className="flex justify-between gap-2 text-[11px] text-muted">
        <span>
          <span className="font-medium text-fg">{formatarCreditos(restantes)}</span> de{" "}
          {formatarCreditos(resumo.limiteCreditos)} créditos
        </span>
        {!compacto && <span>{restantes > 0 ? tempoEstimado(restantes) : `renova ${renovacao(resumo)}`}</span>}
      </p>
    </div>
  );
}
