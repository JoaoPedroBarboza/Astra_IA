"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConversaDetalhe, ConversaResumo } from "@/lib/conversas";

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const corpo = await res.json().catch(() => null);
  if (!res.ok) throw new Error(corpo?.error ?? `Falha na requisição (${res.status}).`);
  return corpo as T;
}

/**
 * Lista do histórico. Começa com a lista lida no servidor (sem "piscar" ao abrir a
 * página) e é recarregada quando uma sessão termina.
 */
export function useConversas(inicial: ConversaResumo[]) {
  const [lista, setLista] = useState(inicial);
  const [erro, setErro] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const { conversas } = await pedir<{ conversas: ConversaResumo[] }>("/api/conversas");
      setLista(conversas);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  const renomear = useCallback(async (id: string, titulo: string) => {
    const r = await pedir<{ titulo: string }>(`/api/conversas/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo }),
    });
    setLista((atual) => atual.map((c) => (c.id === id ? { ...c, titulo: r.titulo } : c)));
    return r.titulo;
  }, []);

  const apagar = useCallback(async (id: string) => {
    await pedir(`/api/conversas/${encodeURIComponent(id)}`, { method: "DELETE" });
    setLista((atual) => atual.filter((c) => c.id !== id));
  }, []);

  return { lista, erro, recarregar, renomear, apagar };
}

type Cache = Record<string, ConversaDetalhe | "erro">;

function buscarDetalhe(id: string): Promise<ConversaDetalhe | "erro"> {
  return pedir<ConversaDetalhe>(`/api/conversas/${encodeURIComponent(id)}`).catch(() => "erro" as const);
}

/**
 * Falas salvas da conversa aberta, guardadas por id (respostas fora de ordem ao trocar
 * rápido de conversa não se misturam).
 *
 * `pausado` congela a busca durante a sessão ao vivo: o agente grava as falas enquanto
 * elas acontecem, e buscá-las agora as duplicaria com a transcrição em tempo real. Ao
 * despausar (fim da sessão) a conversa é buscada de novo, já com o que foi dito.
 */
export function useConversa(id: string | null, pausado: boolean) {
  const [cache, setCache] = useState<Cache>({});

  const guardar = useCallback((alvo: string, resultado: ConversaDetalhe | "erro") => {
    // Uma falha não apaga o que já havia (ex.: falha ao atualizar depois da sessão).
    setCache((c) => (resultado === "erro" && c[alvo] && c[alvo] !== "erro" ? c : { ...c, [alvo]: resultado }));
  }, []);

  const recarregar = useCallback(
    (alvo: string) => buscarDetalhe(alvo).then((r) => guardar(alvo, r)),
    [guardar],
  );

  useEffect(() => {
    if (id && !pausado) void buscarDetalhe(id).then((r) => guardar(id, r));
  }, [id, pausado, guardar]);

  const atualizarTitulo = useCallback((alvo: string, titulo: string) => {
    setCache((c) => {
      const d = c[alvo];
      return d && d !== "erro" ? { ...c, [alvo]: { ...d, titulo } } : c;
    });
  }, []);

  const valor = id ? cache[id] : undefined;
  return {
    detalhe: valor && valor !== "erro" ? valor : null,
    carregando: id !== null && valor === undefined,
    erro: valor === "erro",
    recarregar,
    atualizarTitulo,
  };
}
