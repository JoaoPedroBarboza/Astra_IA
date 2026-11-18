"use client";

import { useCallback, useState } from "react";
import type { SessaoRecente } from "@/app/api/conta/uso/route";
import type { ResumoPlano } from "@/lib/planos";

/**
 * Plano e saldo do usuário. Começa com o valor calculado no servidor (sem "piscar" ao
 * abrir a página) e é recarregado quando uma sessão termina ou a tela de plano abre.
 */
export function usePlano(inicial: ResumoPlano) {
  const [resumo, setResumo] = useState(inicial);
  // null = ainda não carregou; "erro" = a consulta falhou e não há lista para mostrar.
  const [sessoes, setSessoes] = useState<SessaoRecente[] | "erro" | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const res = await fetch("/api/conta/uso", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const dados = (await res.json()) as { resumo: ResumoPlano; sessoes: SessaoRecente[] };
      setResumo(dados.resumo);
      setSessoes(dados.sessoes);
    } catch {
      // Mantém o resumo conhecido; só a lista, que nunca chegou, vira erro.
      setSessoes((atual) => (Array.isArray(atual) ? atual : "erro"));
    }
  }, []);

  return { resumo, sessoes, recarregar };
}
