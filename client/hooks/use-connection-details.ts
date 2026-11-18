"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConnectionDetails } from "@/app/api/token/route";

export type ConnectionDetailsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; details: ConnectionDetails }
  | { status: "error"; message: string };

export function useConnectionDetails() {
  const router = useRouter();
  const [state, setState] = useState<ConnectionDetailsState>({ status: "idle" });

  /**
   * Abre uma sessão. Com `conversaId`, continua essa conversa do histórico; sem ele,
   * começa uma nova. Devolve os detalhes (com o id da conversa) ou null se falhar.
   */
  const connect = useCallback(async (conversaId?: string | null): Promise<ConnectionDetails | null> => {
    setState({ status: "loading" });
    try {
      const url = conversaId ? `/api/token?conversa=${encodeURIComponent(conversaId)}` : "/api/token";
      const res = await fetch(url, { cache: "no-store" });
      if (res.status === 401) {
        // Sessão expirou com a página aberta: volta para o login.
        router.replace("/login");
        return null;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Falha ao obter token de acesso (${res.status}).`);
      }
      const details = (await res.json()) as ConnectionDetails;
      setState({ status: "ready", details });
      return details;
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao conectar.",
      });
      return null;
    }
  }, [router]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, connect, reset };
}
